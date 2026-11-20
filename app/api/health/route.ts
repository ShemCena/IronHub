import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [userCount, memberCount] = await Promise.all([
      prisma.user.count(),
      prisma.member.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "connected",
      stats: {
        users: userCount,
        members: memberCount,
      },
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasDirectUrl: Boolean(process.env.DIRECT_URL),
        hasAuthSecret: Boolean(process.env.AUTH_SECRET),
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : String(error),
        env: {
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          hasDirectUrl: Boolean(process.env.DIRECT_URL),
          hasAuthSecret: Boolean(process.env.AUTH_SECRET),
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    );
  }
}
