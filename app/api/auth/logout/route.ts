import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { clearMemberSessionCookie } from "@/lib/auth/member-session";

export async function POST() {
  await clearSessionCookie();
  await clearMemberSessionCookie();
  return NextResponse.json({ ok: true });
}
