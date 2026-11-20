import { NextResponse } from "next/server";
import type { MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { memberCreateSchema } from "@/lib/validation/schemas";
import { calculateMembershipEndDate } from "@/lib/domain/membership";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: Request) {
  try {
    const session = await requireStaffSession("members:view");
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = searchParams.get("status") ?? "ALL";
    const planId = searchParams.get("planId") ?? "ALL";
    const scope = searchParams.get("scope") ?? "all";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? "12")));

    const where: Prisma.MemberWhereInput = {
      status: status === "ALL" ? { not: "ARCHIVED" } : (status as MemberStatus),
    };

    if (session.role === "TRAINER" && scope === "mine") {
      where.trainerId = session.userId;
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { memberCode: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    if (planId !== "ALL") {
      where.memberships = {
        some: { planId, status: "ACTIVE" },
      };
    }

    const [members, total, totalCount, activeCount, expiredCount, suspendedCount, trainers] =
      await Promise.all([
        prisma.member.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            trainer: { select: { id: true, name: true } },
            memberships: {
              orderBy: { endDate: "desc" },
              take: 1,
            },
            qrCredentials: {
              where: { isActive: true },
              select: { id: true, tokenLast4: true, issuedAt: true },
              take: 1,
            },
          },
        }),
        prisma.member.count({ where }),
        prisma.member.count({ where: { status: { not: "ARCHIVED" } } }),
        prisma.member.count({ where: { status: "ACTIVE" } }),
        prisma.member.count({ where: { status: "EXPIRED" } }),
        prisma.member.count({ where: { status: "SUSPENDED" } }),
        prisma.user.findMany({
          where: { role: "TRAINER", isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

    return NextResponse.json({
      role: session.role,
      trainers,
      members: members.map((m) => ({
        id: m.id,
        memberCode: m.memberCode,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        photoUrl: m.photoUrl,
        status: m.status,
        joinedAt: m.joinedAt,
        trainerId: m.trainerId,
        trainerName: m.trainer?.name ?? null,
        currentPlan: m.memberships[0]?.planNameSnapshot ?? null,
        expiryDate: m.memberships[0]?.endDate ?? null,
        hasActiveQr: m.qrCredentials.length > 0,
        qrLast4: m.qrCredentials[0]?.tokenLast4 ?? null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      summary: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        suspended: suspendedCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load members";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("members:write");
    const body = await request.json();
    const parsed = memberCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid member data." },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const cleanEmail = data.email ? data.email.toLowerCase() : null;

    if (cleanEmail) {
      const duplicate = await prisma.member.findUnique({ where: { email: cleanEmail } });
      if (duplicate) {
        return NextResponse.json(
          { error: "A member with this email address already exists." },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.member.count();
      const memberCode = `IH-${String(count + 1001).padStart(4, "0")}`;

      let assignedPlan = null;
      if (data.planId) {
        assignedPlan = await tx.membershipPlan.findUnique({
          where: { id: data.planId },
        });
        if (!assignedPlan || !assignedPlan.isActive) {
          throw new Error("Selected membership plan is not available.");
        }
      }

      const member = await tx.member.create({
        data: {
          memberCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: cleanEmail,
          phone: data.phone || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          address: data.address || null,
          notes: data.notes || null,
          trainerId: data.trainerId || null,
          status: assignedPlan ? "ACTIVE" : "EXPIRED",
        },
      });

      if (assignedPlan) {
        const startDate = new Date();
        const endDate = calculateMembershipEndDate(
          startDate,
          assignedPlan.durationValue,
          assignedPlan.durationUnit
        );

        const membership = await tx.membership.create({
          data: {
            memberId: member.id,
            planId: assignedPlan.id,
            planNameSnapshot: assignedPlan.name,
            priceSnapshot: assignedPlan.price,
            startDate,
            endDate,
            status: "ACTIVE",
            isRenewal: false,
          },
        });

        const totalDue =
          Number(assignedPlan.price) + Number(assignedPlan.enrollmentFee);

        const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
        await tx.payment.create({
          data: {
            receiptNumber,
            memberId: member.id,
            membershipId: membership.id,
            recordedById: session.userId,
            amount: totalDue,
            method: data.paymentMethod ?? "CASH",
            status: "PAID",
            referenceNumber: data.paymentReference || null,
            notes: "Initial registration over-the-counter payment",
          },
        });
      }

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "MEMBER_CREATED",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          memberCode: member.memberCode,
          assignedPlanId: assignedPlan?.id ?? null,
        },
      });

      return member;
    });

    return NextResponse.json({ member: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create member";
    const status = message.startsWith("Unauthorized")
      ? 401
      : message.startsWith("Forbidden")
      ? 403
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
