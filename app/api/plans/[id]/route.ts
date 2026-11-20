import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { planSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("plans:manage");
    const { id } = await params;
    const body = await request.json();
    const parsed = planSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid plan update." },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPopular) {
        await tx.membershipPlan.updateMany({
          where: { isPopular: true, id: { not: id } },
          data: { isPopular: false },
        });
      }

      const plan = await tx.membershipPlan.update({
        where: { id },
        data: parsed.data,
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "PLAN_UPDATED",
        entityType: "MembershipPlan",
        entityId: id,
        metadata: { name: plan.name, price: Number(plan.price), isActive: plan.isActive },
      });

      return plan;
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update plan";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
