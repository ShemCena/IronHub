import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
      const assignedRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM members WHERE "trainerId" = ${session.userId} AND status <> 'ARCHIVED'
      `;
      where.id = { in: assignedRows.map((r) => r.id) };
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

    const [members, total, statusGroups, trainers, trainerRows] =
      await Promise.all([
        prisma.member.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
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
        prisma.member.groupBy({
          by: ["status"],
          where: { status: { not: "ARCHIVED" } },
          _count: { _all: true },
        }),
        prisma.user.findMany({
          where: { role: "TRAINER", isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.$queryRaw<{ id: string; trainerId: string | null; trainerFee: number | null }[]>`
          SELECT id, "trainerId", "trainerFee"::float8 AS "trainerFee" FROM members WHERE status <> 'ARCHIVED'
        `,
      ]);

    const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
    const activeCount = statusCounts.get("ACTIVE") ?? 0;
    const expiredCount = statusCounts.get("EXPIRED") ?? 0;
    const suspendedCount = statusCounts.get("SUSPENDED") ?? 0;
    const totalCount = activeCount + expiredCount + suspendedCount;

    const trainerNameById = new Map(trainers.map((t) => [t.id, t.name]));
    const trainerMetaByMemberId = new Map(
      trainerRows.map((r) => [r.id, { trainerId: r.trainerId, trainerFee: Number(r.trainerFee ?? 0) }])
    );

    return NextResponse.json({
      role: session.role,
      trainers,
      members: members.map((m) => {
        const meta = trainerMetaByMemberId.get(m.id);
        const assignedTrainerId = meta?.trainerId ?? null;
        return {
          id: m.id,
          memberCode: m.memberCode,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          phone: m.phone,
          photoUrl: m.photoUrl,
          status: m.status,
          joinedAt: m.joinedAt,
          trainerId: assignedTrainerId,
          trainerName: assignedTrainerId ? trainerNameById.get(assignedTrainerId) ?? null : null,
          trainerFee: meta?.trainerFee ?? 0,
          currentPlan: m.memberships[0]?.planNameSnapshot ?? null,
          expiryDate: m.memberships[0]?.endDate ?? null,
          hasActiveQr: m.qrCredentials.length > 0,
          qrLast4: m.qrCredentials[0]?.tokenLast4 ?? null,
        };
      }),
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
    const cleanEmail = data.email.toLowerCase();

    const [duplicateMember, duplicateUser] = await Promise.all([
      prisma.member.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
    ]);

    if (duplicateMember || duplicateUser) {
      return NextResponse.json(
        { error: "This email address is already registered to another account." },
        { status: 409 }
      );
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

      const initialPasswordHash = await bcrypt.hash(data.password, 12);
      const assignedTrainerId =
        session.role === "TRAINER" ? session.userId : data.trainerId || null;
      const trainerFee = Number(data.trainerFee ?? 0);

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
          passwordHash: initialPasswordHash,
          portalActivatedAt: new Date(),
          status: assignedPlan ? "ACTIVE" : "EXPIRED",
        },
      });

      await tx.$executeRaw`
        UPDATE members SET "trainerId" = ${assignedTrainerId}, "trainerFee" = ${trainerFee} WHERE id = ${member.id}
      `;

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
