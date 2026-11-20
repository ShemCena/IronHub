import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireMemberSession } from "@/lib/auth/member-session";
import { decryptQrToken } from "@/lib/qr/token";
import { isGymCurrentlyOpen, type BusinessHoursMap } from "@/lib/domain/membership";

const memberSelfUpdateSchema = z.object({
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  photoUrl: z
    .string()
    .max(600000, "Profile image is too large.")
    .optional()
    .nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function GET() {
  try {
    const session = await requireMemberSession();
    const [member, settings] = await Promise.all([
      prisma.member.findUnique({
        where: { id: session.memberId },
        include: {
          memberships: {
            orderBy: { endDate: "desc" },
            include: { plan: { select: { benefits: true, durationValue: true, durationUnit: true } } },
          },
          payments: {
            orderBy: { paidAt: "desc" },
            take: 20,
            include: { membership: { select: { planNameSnapshot: true } } },
          },
          qrCredentials: {
            where: { isActive: true },
            orderBy: { issuedAt: "desc" },
            take: 1,
          },
          attendanceRecords: {
            orderBy: { checkedInAt: "desc" },
            take: 40,
          },
        },
      }),
      prisma.gymSetting.findUnique({ where: { id: "default" } }),
    ]);

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMembership = member.memberships[0] ?? null;

    let daysRemaining: number | null = null;
    if (currentMembership) {
      const diffMs = currentMembership.endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    const approvedAttendance = member.attendanceRecords.filter((a) => a.outcome === "APPROVED");
    const visitsThisMonth = approvedAttendance.filter((a) => a.checkedInAt >= startOfMonth).length;

    const activeCred = member.qrCredentials[0] ?? null;
    let qrDataUrl: string | null = null;
    let rawToken: string | null = null;

    if (activeCred?.tokenCiphertext) {
      rawToken = decryptQrToken(activeCred.tokenCiphertext);
      if (rawToken) {
        qrDataUrl = await QRCode.toDataURL(rawToken, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 300,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
      }
    }

    const gymStatus = isGymCurrentlyOpen(
      (settings?.businessHours as BusinessHoursMap | undefined) ?? null,
      settings?.timezone ?? "Asia/Manila"
    );

    return NextResponse.json({
      gymName: settings?.gymName ?? "IronHub Fitness",
      gymStatus,
      member: {
        id: member.id,
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        phone: member.phone,
        address: member.address,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        photoUrl: member.photoUrl,
        status: member.status,
        joinedAt: member.joinedAt,
      },
      currentPlan: currentMembership
        ? {
            id: currentMembership.id,
            name: currentMembership.planNameSnapshot,
            price: Number(currentMembership.priceSnapshot),
            startDate: currentMembership.startDate,
            endDate: currentMembership.endDate,
            status: currentMembership.status,
            daysRemaining,
            benefits: currentMembership.plan?.benefits ?? [],
          }
        : null,
      stats: {
        visitsThisMonth,
        totalVisits: approvedAttendance.length,
        daysRemaining,
      },
      memberships: member.memberships.map((m) => ({
        id: m.id,
        planName: m.planNameSnapshot,
        price: Number(m.priceSnapshot),
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        isRenewal: m.isRenewal,
      })),
      payments: member.payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        planName: p.membership?.planNameSnapshot ?? "Membership",
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
      })),
      attendance: member.attendanceRecords.map((a) => ({
        id: a.id,
        method: a.method,
        outcome: a.outcome,
        denialReason: a.denialReason,
        checkedInAt: a.checkedInAt,
      })),
      credential: activeCred
        ? {
            id: activeCred.id,
            tokenLast4: activeCred.tokenLast4,
            issuedAt: activeCred.issuedAt,
          }
        : null,
      qrDataUrl,
      tokenPreview: rawToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load member dashboard";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireMemberSession();
    const body = await request.json();
    const parsed = memberSelfUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile update." },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.member.findUnique({ where: { id: session.memberId } });
    if (!existing) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    let nextPasswordHash: string | undefined;
    if (data.newPassword) {
      if (!data.currentPassword || !existing.passwordHash) {
        return NextResponse.json(
          { error: "Enter your current password to set a new password." },
          { status: 400 }
        );
      }
      const ok = await bcrypt.compare(data.currentPassword, existing.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      nextPasswordHash = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.member.update({
      where: { id: existing.id },
      data: {
        phone: data.phone !== undefined ? data.phone || null : undefined,
        address: data.address !== undefined ? data.address || null : undefined,
        emergencyContactName:
          data.emergencyContactName !== undefined ? data.emergencyContactName || null : undefined,
        emergencyContactPhone:
          data.emergencyContactPhone !== undefined ? data.emergencyContactPhone || null : undefined,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : undefined,
        passwordHash: nextPasswordHash,
      },
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        phone: updated.phone,
        address: updated.address,
        emergencyContactName: updated.emergencyContactName,
        emergencyContactPhone: updated.emergencyContactPhone,
        photoUrl: updated.photoUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const status = message.startsWith("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
