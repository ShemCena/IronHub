import { describe, expect, it } from "vitest";
import {
  calculateMembershipEndDate,
  DEFAULT_BUSINESS_HOURS,
  evaluateCheckInEligibility,
  isGymCurrentlyOpen,
} from "@/lib/domain/membership";
import {
  decryptQrToken,
  encryptQrToken,
  generateOpaqueQrToken,
  hashQrToken,
  isValidQrTokenFormat,
} from "@/lib/qr/token";
import { canManageStaffRole, hasPermission } from "@/lib/permissions/rbac";

describe("Membership domain logic", () => {
  it("calculates end date for months, weeks, and days", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    expect(calculateMembershipEndDate(start, 1, "MONTHS").toISOString()).toBe(
      "2026-02-15T00:00:00.000Z"
    );
    expect(calculateMembershipEndDate(start, 2, "WEEKS").toISOString()).toBe(
      "2026-01-29T00:00:00.000Z"
    );
    expect(calculateMembershipEndDate(start, 10, "DAYS").toISOString()).toBe(
      "2026-01-25T00:00:00.000Z"
    );
  });

  it("evaluates gym open/closed state from business hours", () => {
    const mondayMorning = new Date("2026-11-16T02:00:00.000Z"); // 10:00 AM Asia/Manila
    expect(isGymCurrentlyOpen(DEFAULT_BUSINESS_HOURS, "Asia/Manila", mondayMorning).isOpen).toBe(
      true
    );

    const mondayLateNight = new Date("2026-11-16T15:30:00.000Z"); // 11:30 PM Asia/Manila
    expect(isGymCurrentlyOpen(DEFAULT_BUSINESS_HOURS, "Asia/Manila", mondayLateNight).isOpen).toBe(
      false
    );
  });

  it("enforces check-in eligibility, suspension, expiry, and duplicate window", () => {
    const now = new Date("2026-11-20T10:00:00.000Z");
    const validEnd = new Date("2026-12-20T10:00:00.000Z");

    expect(
      evaluateCheckInEligibility({
        memberStatus: "SUSPENDED",
        latestMembershipEnd: validEnd,
        lastApprovedCheckInAt: null,
        allowMultipleCheckInsPerDay: false,
        duplicateCheckInWindowMinutes: 30,
        now,
      }).eligible
    ).toBe(false);

    expect(
      evaluateCheckInEligibility({
        memberStatus: "ACTIVE",
        latestMembershipEnd: validEnd,
        lastApprovedCheckInAt: new Date("2026-11-20T09:45:00.000Z"),
        allowMultipleCheckInsPerDay: false,
        duplicateCheckInWindowMinutes: 30,
        now,
      }).eligible
    ).toBe(false);

    expect(
      evaluateCheckInEligibility({
        memberStatus: "ACTIVE",
        latestMembershipEnd: validEnd,
        lastApprovedCheckInAt: null,
        allowMultipleCheckInsPerDay: false,
        duplicateCheckInWindowMinutes: 30,
        now,
      }).eligible
    ).toBe(true);
  });
});

describe("QR token security", () => {
  it("generates opaque tokens with SHA-256 hashes and AES-256-GCM portal encryption", () => {
    const { rawToken, tokenHash, tokenLast4 } = generateOpaqueQrToken();
    expect(isValidQrTokenFormat(rawToken)).toBe(true);
    expect(hashQrToken(rawToken)).toBe(tokenHash);
    expect(tokenLast4).toHaveLength(4);

    const encrypted = encryptQrToken(rawToken);
    expect(decryptQrToken(encrypted)).toBe(rawToken);
  });
});

describe("RBAC permissions & staff hierarchy", () => {
  it("allows Owner and Admin to manage staff according to hierarchy", () => {
    expect(hasPermission("OWNER", "settings:manage")).toBe(true);
    expect(hasPermission("ADMIN", "staff:manage")).toBe(true);
    expect(canManageStaffRole("OWNER", "ADMIN")).toBe(true);
    expect(canManageStaffRole("ADMIN", "FRONT_DESK")).toBe(true);
    expect(canManageStaffRole("ADMIN", "TRAINER")).toBe(true);
    expect(canManageStaffRole("ADMIN", "ADMIN")).toBe(true);
    expect(canManageStaffRole("ADMIN", "OWNER")).toBe(false);
    expect(hasPermission("FRONT_DESK", "payments:record")).toBe(true);
    expect(hasPermission("FRONT_DESK", "payments:refund_void")).toBe(false);
    expect(hasPermission("TRAINER", "reports:view")).toBe(false);
  });
});
