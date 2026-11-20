import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid staff email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Initial password must be at least 8 characters.")
    .max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  trainerId: z.string().trim().optional().or(z.literal("")),
  trainerFee: z.coerce.number().min(0, "Trainor fee cannot be negative.").max(500000).optional(),
  planId: z.string().trim().optional().or(z.literal("")),
  paymentMethod: z
    .enum(["CASH", "CARD", "EWALLET", "BANK_TRANSFER", "OTHER"])
    .optional(),
  paymentReference: z.string().trim().max(100).optional().or(z.literal("")),
});

export const memberUpdateSchema = memberCreateSchema
  .omit({ planId: true, paymentMethod: true, paymentReference: true, password: true })
  .extend({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(100)
      .optional()
      .or(z.literal("")),
    status: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "ARCHIVED"]).optional(),
  });

export const planSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required.").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1000000),
  enrollmentFee: z.coerce.number().min(0).max(500000).default(0),
  durationValue: z.coerce.number().int().min(1).max(3650),
  durationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]),
  benefits: z.array(z.string().trim().min(1)).max(12).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const recordPaymentSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
  planId: z.string().min(1, "Membership plan is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  method: z.enum(["CASH", "CARD", "EWALLET", "BANK_TRANSFER", "OTHER"]),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  isRenewal: z.boolean().default(false),
});

export const refundOrVoidSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["REFUND", "VOID"]),
  reason: z.string().trim().min(4, "Provide a brief reason for the audit log.").max(300),
});

export const qrCheckInSchema = z.object({
  token: z.string().trim().min(16, "Invalid QR credential format.").max(256),
  deviceLabel: z.string().trim().max(80).optional(),
});

export const manualCheckInSchema = z.object({
  memberId: z.string().min(1, "Select a member."),
  deviceLabel: z.string().trim().max(80).optional(),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
  role: z.enum(["ADMIN", "TRAINER"]),
});

export const staffUpdateSchema = z.object({
  role: z.enum(["ADMIN", "TRAINER"]).optional(),
  isActive: z.boolean().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(100),
});

export const memberPortalLoginSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your Member ID (e.g. IH-1001) or email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const memberPortalActivateSchema = z.object({
  memberCode: z.string().trim().min(3, "Enter your Member ID (e.g. IH-1001)."),
  emailOrPhone: z.string().trim().min(3, "Enter the email or phone on your profile."),
  password: z.string().min(8, "Choose a password of at least 8 characters.").max(100),
});

export const gymSettingsSchema = z.object({
  gymName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(3).max(240),
  timezone: z.string().trim().min(3).max(60),
  allowMultipleCheckInsPerDay: z.boolean(),
  duplicateCheckInWindowMinutes: z.coerce.number().int().min(1).max(1440),
  expiryReminderDays: z.coerce.number().int().min(1).max(60),
  businessHours: z.record(
    z.string(),
    z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
      closed: z.boolean(),
    })
  ),
});
