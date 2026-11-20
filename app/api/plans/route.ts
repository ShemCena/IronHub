import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { planSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET() {
  try {
    await requireStaffSession("plans:view");
    const plans = await prisma.membershipPlan.findMany({
      orderBy: [{ isActive: "desc" }, { price: "asc" }],
      include: {
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        enrollmentFee: Number(p.enrollmentFee),
        durationValue: p.durationValue,
        durationUnit: p.durationUnit,
        benefits: p.benefits,
        isPopular: p.isPopular,
        isActive: p.isActive,
        activeSubscribers: p._count.memberships,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plans";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("plans:manage");
    const body = await request.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid plan details." },
        { status: 422 }
      );
    }

    const plan = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPopular) {
        await tx.membershipPlan.updateMany({
          where: { isPopular: true },
          data: { isPopular: false },
        });
      }

      const created = await tx.membershipPlan.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description || null,
          price: parsed.data.price,
          enrollmentFee: parsed.data.enrollmentFee,
          durationValue: parsed.data.durationValue,
          durationUnit: parsed.data.durationUnit,
          benefits: parsed.data.benefits,
          isPopular: parsed.data.isPopular,
          isActive: parsed.data.isActive,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "PLAN_CREATED",
        entityType: "MembershipPlan",
        entityId: created.id,
        metadata: { name: created.name, price: Number(created.price) },
      });

      return created;
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create plan";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
