import { NextResponse } from "next/server";
import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { recordPaymentSchema } from "@/lib/validation/schemas";
import { calculateMembershipEndDate } from "@/lib/domain/membership";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: Request) {
  try {
    await requireStaffSession("payments:view");
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = searchParams.get("status") ?? "ALL";
    const method = searchParams.get("method") ?? "ALL";

    const where: Prisma.PaymentWhereInput = {};
    if (status !== "ALL") where.status = status as PaymentStatus;
    if (method !== "ALL") where.method = method as PaymentMethod;
    if (q) {
      where.OR = [
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } },
        { member: { firstName: { contains: q, mode: "insensitive" } } },
        { member: { lastName: { contains: q, mode: "insensitive" } } },
        { member: { memberCode: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [payments, paidAgg, pendingAgg, refundedAgg] = await Promise.all([
      prisma.payment.findMany({
        where,
        take: 100,
        orderBy: { paidAt: "desc" },
        include: {
          member: {
            select: { id: true, memberCode: true, firstName: true, lastName: true },
          },
          membership: {
            select: { planNameSnapshot: true, startDate: true, endDate: true },
          },
          recordedBy: { select: { name: true } },
        },
      }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PENDING" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "REFUNDED" } }),
    ]);

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        memberId: p.member.id,
        memberCode: p.member.memberCode,
        memberName: `${p.member.firstName} ${p.member.lastName}`,
        planName: p.membership?.planNameSnapshot ?? "Manual Entry",
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        recordedBy: p.recordedBy?.name ?? "Staff",
        paidAt: p.paidAt,
      })),
      totals: {
        collected: Number(paidAgg._sum.amount ?? 0),
        pending: Number(pendingAgg._sum.amount ?? 0),
        refunded: Number(refundedAgg._sum.amount ?? 0),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payments";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("payments:record");
    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payment data." },
        { status: 422 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const [member, plan] = await Promise.all([
        tx.member.findUnique({ where: { id: data.memberId } }),
        tx.membershipPlan.findUnique({ where: { id: data.planId } }),
      ]);

      if (!member || member.status === "ARCHIVED") {
        throw new Error("Member not found or archived.");
      }
      if (!plan || !plan.isActive) {
        throw new Error("Selected membership plan is inactive or unavailable.");
      }

      const startDate = new Date();
      const endDate = calculateMembershipEndDate(
        startDate,
        plan.durationValue,
        plan.durationUnit
      );

      // Expire prior active memberships cleanly when issuing a new period
      await tx.membership.updateMany({
        where: { memberId: member.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      const membership = await tx.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          planNameSnapshot: plan.name,
          priceSnapshot: plan.price,
          startDate,
          endDate,
          status: "ACTIVE",
          isRenewal: data.isRenewal,
        },
      });

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          memberId: member.id,
          membershipId: membership.id,
          recordedById: session.userId,
          amount: data.amount,
          method: data.method,
          status: "PAID",
          referenceNumber: data.referenceNumber || null,
          notes: data.notes || "Over-the-counter payment",
        },
      });

      if (member.status !== "SUSPENDED") {
        await tx.member.update({
          where: { id: member.id },
          data: { status: "ACTIVE" },
        });
      }

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: data.isRenewal ? "PAYMENT_RENEWAL_RECORDED" : "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          receiptNumber,
          memberId: member.id,
          planName: plan.name,
          amount: data.amount,
          method: data.method,
        },
      });

      return { payment, membership };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record payment";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
