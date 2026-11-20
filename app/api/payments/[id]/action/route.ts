import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { refundOrVoidSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("payments:refund_void");
    const { id } = await params;
    const body = await request.json();
    const parsed = refundOrVoidSchema.safeParse({ ...body, paymentId: id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid action payload." },
        { status: 422 }
      );
    }

    const { action, reason } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { id } });
      if (!existing) throw new Error("Payment record not found.");
      if (existing.status === "REFUNDED" || existing.status === "VOIDED") {
        throw new Error(`Payment is already ${existing.status.toLowerCase()}.`);
      }

      const now = new Date();
      const payment = await tx.payment.update({
        where: { id },
        data:
          action === "REFUND"
            ? { status: "REFUNDED", refundedAt: now, refundReason: reason }
            : { status: "VOIDED", voidedAt: now, voidReason: reason },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: action === "REFUND" ? "PAYMENT_REFUNDED" : "PAYMENT_VOIDED",
        entityType: "Payment",
        entityId: id,
        metadata: {
          receiptNumber: existing.receiptNumber,
          amount: Number(existing.amount),
          reason,
        },
      });

      return payment;
    });

    return NextResponse.json({ payment: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
