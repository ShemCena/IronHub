import { NextResponse } from "next/server";

/**
 * Staff and Admins are not permitted to generate QR codes on behalf of clients.
 * Clients generate and manage their own QR pass inside the Member Portal (/portal).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Forbidden: Admins and staff cannot generate QR codes for clients. Clients must generate their own QR pass in the Member Portal (/portal).",
    },
    { status: 403 }
  );
}
