import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { manualCheckInSchema, qrCheckInSchema } from "@/lib/validation/schemas";
import { hashQrToken, isValidQrTokenFormat } from "@/lib/qr/token";
import { evaluateCheckInEligibility } from "@/lib/domain/membership";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET() {
  try {
    await requireStaffSession("checkin:perform");
    const recent = await prisma.attendanceRecord.findMany({
      take: 20,
      orderBy: { checkedInAt: "desc" },
      include: {
        member: {
          select: {
            id: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            status: true,
            memberships: {
              orderBy: { endDate: "desc" },
              take: 1,
              select: { planNameSnapshot: true },
            },
          },
        },
        recordedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      records: recent.map((r) => ({
        id: r.id,
        memberId: r.member.id,
        memberCode: r.member.memberCode,
        memberName: `${r.member.firstName} ${r.member.lastName}`,
        planName: r.member.memberships[0]?.planNameSnapshot ?? "No Plan",
        method: r.method,
        outcome: r.outcome,
        denialReason: r.denialReason,
        recordedBy: r.recordedBy?.name ?? "System",
        checkedInAt: r.checkedInAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load check-ins";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("checkin:perform");
    const body = await request.json();

    const isManual = body?.method === "MANUAL";
    const settings = await prisma.gymSetting.findUnique({ where: { id: "default" } });
    const allowMultiple = settings?.allowMultipleCheckInsPerDay ?? false;
    const dupWindow = settings?.duplicateCheckInWindowMinutes ?? 30;

    let targetMemberId: string | null = null;
    let deviceLabel: string | undefined;

    if (isManual) {
      const parsed = manualCheckInSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid check-in request." },
          { status: 422 }
        );
      }
      targetMemberId = parsed.data.memberId;
      deviceLabel = parsed.data.deviceLabel;
    } else {
      const parsed = qrCheckInSchema.safeParse(body);
      if (!parsed.success || !isValidQrTokenFormat(parsed.data.token)) {
        const rate = checkRateLimit(`qr-invalid:${session.userId}`, 25, 60 * 1000);
        if (!rate.allowed) {
          return NextResponse.json(
            { error: "Too many invalid scan attempts. Wait a moment." },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            outcome: "DENIED",
            reason: "Unrecognized or malformed QR credential.",
          },
          { status: 400 }
        );
      }

      deviceLabel = parsed.data.deviceLabel;
      const tokenHash = hashQrToken(parsed.data.token);
      const cred = await prisma.qRCredential.findUnique({
        where: { tokenHash },
        select: { id: true, memberId: true, isActive: true, revokedReason: true },
      });

      if (!cred || !cred.isActive) {
        const rate = checkRateLimit(`qr-invalid:${session.userId}`, 25, 60 * 1000);
        if (!rate.allowed) {
          return NextResponse.json(
            { error: "Too many invalid scan attempts. Wait a moment." },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            outcome: "DENIED",
            reason: cred ? "QR credential has been revoked." : "Invalid QR credential.",
          },
          { status: 400 }
        );
      }

      targetMemberId = cred.memberId;
    }

    const member = await prisma.member.findUnique({
      where: { id: targetMemberId },
      include: {
        memberships: { orderBy: { endDate: "desc" }, take: 1 },
        attendanceRecords: {
          where: { outcome: "APPROVED" },
          orderBy: { checkedInAt: "desc" },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { outcome: "DENIED", reason: "Member record not found." },
        { status: 404 }
      );
    }

    const latestMembership = member.memberships[0] ?? null;
    const lastApproved = member.attendanceRecords[0] ?? null;

    const eligibility = evaluateCheckInEligibility({
      memberStatus: member.status,
      latestMembershipEnd: latestMembership?.endDate ?? null,
      lastApprovedCheckInAt: lastApproved?.checkedInAt ?? null,
      allowMultipleCheckInsPerDay: allowMultiple,
      duplicateCheckInWindowMinutes: dupWindow,
    });

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.attendanceRecord.create({
        data: {
          memberId: member.id,
          recordedById: session.userId,
          method: isManual ? "MANUAL" : "QR",
          outcome: eligibility.eligible ? "APPROVED" : "DENIED",
          denialReason: eligibility.reason ?? null,
          deviceLabel: deviceLabel ?? "Front Desk Terminal",
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: eligibility.eligible
          ? isManual
            ? "CHECKIN_MANUAL_APPROVED"
            : "CHECKIN_QR_APPROVED"
          : "CHECKIN_DENIED",
        entityType: "AttendanceRecord",
        entityId: created.id,
        metadata: {
          memberId: member.id,
          method: isManual ? "MANUAL" : "QR",
          reason: eligibility.reason ?? null,
        },
      });

      return created;
    });

    return NextResponse.json({
      outcome: record.outcome,
      reason: record.denialReason,
      checkedInAt: record.checkedInAt,
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: `${member.firstName} ${member.lastName}`,
        planName: latestMembership?.planNameSnapshot ?? "No Plan",
        expiryDate: latestMembership?.endDate ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check-in failed";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
