import type { MemberStatus, PlanDurationUnit } from "@prisma/client";

export interface BusinessHourDay {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessHoursMap = Record<string, BusinessHourDay>;

export const DEFAULT_BUSINESS_HOURS: BusinessHoursMap = {
  monday: { open: "05:30", close: "22:00", closed: false },
  tuesday: { open: "05:30", close: "22:00", closed: false },
  wednesday: { open: "05:30", close: "22:00", closed: false },
  thursday: { open: "05:30", close: "22:00", closed: false },
  friday: { open: "05:30", close: "22:00", closed: false },
  saturday: { open: "06:00", close: "21:00", closed: false },
  sunday: { open: "07:00", close: "19:00", closed: false },
};

export function calculateMembershipEndDate(
  startDate: Date,
  durationValue: number,
  durationUnit: PlanDurationUnit
): Date {
  const end = new Date(startDate);
  if (durationUnit === "DAYS") {
    end.setDate(end.getDate() + durationValue);
  } else if (durationUnit === "WEEKS") {
    end.setDate(end.getDate() + durationValue * 7);
  } else {
    end.setMonth(end.getMonth() + durationValue);
  }
  return end;
}

export function isGymCurrentlyOpen(
  businessHours: BusinessHoursMap | null | undefined,
  timeZone = "Asia/Manila",
  now = new Date()
): { isOpen: boolean; label: string } {
  const hours = businessHours ?? DEFAULT_BUSINESS_HOURS;
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone,
  })
    .format(now)
    .toLowerCase();

  const currentHHMM = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(now);

  const dayConfig = hours[weekday];
  if (!dayConfig || dayConfig.closed) {
    return { isOpen: false, label: "Gym Closed" };
  }

  const isOpen = currentHHMM >= dayConfig.open && currentHHMM <= dayConfig.close;
  return {
    isOpen,
    label: isOpen ? "Gym Open" : "Gym Closed",
  };
}

export function evaluateCheckInEligibility(params: {
  memberStatus: MemberStatus;
  latestMembershipEnd: Date | null;
  lastApprovedCheckInAt: Date | null;
  allowMultipleCheckInsPerDay: boolean;
  duplicateCheckInWindowMinutes: number;
  now?: Date;
}): { eligible: boolean; reason?: string } {
  const now = params.now ?? new Date();

  if (params.memberStatus === "ARCHIVED") {
    return { eligible: false, reason: "Member profile is archived." };
  }
  if (params.memberStatus === "SUSPENDED") {
    return { eligible: false, reason: "Account is currently suspended." };
  }
  if (!params.latestMembershipEnd || params.latestMembershipEnd < now) {
    return { eligible: false, reason: "Membership has expired or is inactive." };
  }
  if (params.memberStatus === "EXPIRED") {
    return { eligible: false, reason: "Membership has expired." };
  }

  if (params.lastApprovedCheckInAt) {
    const diffMinutes =
      (now.getTime() - params.lastApprovedCheckInAt.getTime()) / (1000 * 60);
    if (diffMinutes < params.duplicateCheckInWindowMinutes) {
      return {
        eligible: false,
        reason: `Duplicate check-in blocked (checked in ${Math.max(1, Math.floor(diffMinutes))}m ago).`,
      };
    }

    if (!params.allowMultipleCheckInsPerDay) {
      const sameDay =
        params.lastApprovedCheckInAt.toDateString() === now.toDateString();
      if (sameDay) {
        return {
          eligible: false,
          reason: "Daily check-in limit reached (1 entry per day policy).",
        };
      }
    }
  }

  return { eligible: true };
}
