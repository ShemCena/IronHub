import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await requireStaffSession();
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH() {
  try {
    const session = await requireStaffSession();
    await prisma.notification.updateMany({
      where: {
        OR: [{ userId: null }, { userId: session.userId }],
        isRead: false,
      },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark read";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
