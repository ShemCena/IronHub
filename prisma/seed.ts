import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_BUSINESS_HOURS } from "../lib/domain/membership";
import { encryptQrToken, generateOpaqueQrToken } from "../lib/qr/token";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("IronHub@2026!", 12);
  const admin2Password = await bcrypt.hash("Admin@2026!", 12);
  const trainerPassword = await bcrypt.hash("Trainer@2026!", 12);
  const memberPassword = await bcrypt.hash("Member@2026!", 12);

  // Remove legacy FRONT_DESK user so only Admin, Trainor, and Client roles exist
  await prisma.user.deleteMany({
    where: { email: "desk@ironhub.ph" },
  });

  const primaryAdmin = await prisma.user.upsert({
    where: { email: "owner@ironhub.ph" },
    update: { role: "ADMIN", isActive: true },
    create: {
      email: "owner@ironhub.ph",
      name: "Coach Marco Reyes",
      passwordHash: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@ironhub.ph" },
    update: { role: "ADMIN", isActive: true },
    create: {
      email: "admin@ironhub.ph",
      name: "Dante Morales",
      passwordHash: admin2Password,
      role: "ADMIN",
      isActive: true,
    },
  });

  const trainer1 = await prisma.user.upsert({
    where: { email: "trainer@ironhub.ph" },
    update: { role: "TRAINER", isActive: true },
    create: {
      email: "trainer@ironhub.ph",
      name: "Liam Cruz",
      passwordHash: trainerPassword,
      role: "TRAINER",
      isActive: true,
    },
  });

  const trainer2 = await prisma.user.upsert({
    where: { email: "carla.coach@ironhub.ph" },
    update: { role: "TRAINER", isActive: true },
    create: {
      email: "carla.coach@ironhub.ph",
      name: "Carla Mendoza",
      passwordHash: trainerPassword,
      role: "TRAINER",
      isActive: true,
    },
  });

  const trainer3 = await prisma.user.upsert({
    where: { email: "miguel.coach@ironhub.ph" },
    update: { role: "TRAINER", isActive: true },
    create: {
      email: "miguel.coach@ironhub.ph",
      name: "Miguel Bautista",
      passwordHash: trainerPassword,
      role: "TRAINER",
      isActive: true,
    },
  });

  const trainers = [trainer1, trainer2, trainer3];

  await prisma.gymSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      gymName: "IronHub Fitness",
      email: "support@ironhub.ph",
      phone: "+63 917 345 6789",
      address: "123 Fitness Street, Cadiz City",
      timezone: "Asia/Manila",
      currency: "PHP",
      businessHours: DEFAULT_BUSINESS_HOURS as unknown as Prisma.InputJsonValue,
      allowMultipleCheckInsPerDay: false,
      duplicateCheckInWindowMinutes: 30,
      expiryReminderDays: 7,
    },
  });

  const plans = [
    {
      name: "Daily Pass",
      description: "Single-day walk-in gym floor access with locker use.",
      price: 150,
      enrollmentFee: 0,
      durationValue: 1,
      durationUnit: "DAYS" as const,
      benefits: ["1-Day Gym Access", "Locker Access"],
      isPopular: false,
    },
    {
      name: "Basic",
      description: "Full gym floor access and standard strength equipment.",
      price: 499,
      enrollmentFee: 0,
      durationValue: 1,
      durationUnit: "MONTHS" as const,
      benefits: ["Gym Access", "Basic Equipment", "Locker Access"],
      isPopular: false,
    },
    {
      name: "Standard",
      description: "Gym floor plus scheduled group conditioning classes.",
      price: 799,
      enrollmentFee: 0,
      durationValue: 1,
      durationUnit: "MONTHS" as const,
      benefits: ["Gym Access", "Group Classes", "Locker Access"],
      isPopular: true,
    },
    {
      name: "Premium",
      description: "Unlimited gym, all classes, and personal coaching sessions.",
      price: 1199,
      enrollmentFee: 0,
      durationValue: 1,
      durationUnit: "MONTHS" as const,
      benefits: ["Gym Access", "All Classes", "Personal Trainer"],
      isPopular: false,
    },
  ];

  const createdPlans = [];
  for (const p of plans) {
    const plan = await prisma.membershipPlan.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
    createdPlans.push(plan);
  }

  const sampleMembers = [
    { code: "IH-1001", first: "Juan", last: "Dela Cruz", email: "juan@ironhub.ph", phone: "+63 917 111 0001", planIdx: 3, trainerIdx: 0, trainerFee: 1200, status: "ACTIVE" as const },
    { code: "IH-1002", first: "Maria", last: "Santos", email: "maria@ironhub.ph", phone: "+63 917 111 0002", planIdx: 2, trainerIdx: 0, trainerFee: 800, status: "ACTIVE" as const },
    { code: "IH-1003", first: "Mark", last: "Reyes", email: "mark@ironhub.ph", phone: "+63 917 111 0003", planIdx: 1, trainerIdx: 1, trainerFee: 600, status: "ACTIVE" as const },
    { code: "IH-1004", first: "Ana", last: "Garcia", email: "ana@ironhub.ph", phone: "+63 917 111 0004", planIdx: 3, trainerIdx: 0, trainerFee: 1200, status: "ACTIVE" as const },
    { code: "IH-1005", first: "Carlos", last: "Villanueva", email: "carlos@ironhub.ph", phone: "+63 917 111 0005", planIdx: 0, trainerIdx: 2, trainerFee: 500, status: "EXPIRED" as const },
    { code: "IH-1006", first: "Bea", last: "Mendoza", email: "bea@ironhub.ph", phone: "+63 917 111 0006", planIdx: 3, trainerIdx: 1, trainerFee: 1000, status: "ACTIVE" as const },
    { code: "IH-1007", first: "Rafael", last: "Torres", email: "rafael@ironhub.ph", phone: "+63 917 111 0007", planIdx: 2, trainerIdx: 2, trainerFee: 750, status: "SUSPENDED" as const },
    { code: "IH-1008", first: "Sofia", last: "Lim", email: "sofia@ironhub.ph", phone: "+63 917 111 0008", planIdx: 0, trainerIdx: 0, trainerFee: 500, status: "ACTIVE" as const },
  ];

  const now = new Date();

  for (let i = 0; i < sampleMembers.length; i++) {
    const m = sampleMembers[i];
    const assignedTrainer = trainers[m.trainerIdx];
    const existing = await prisma.member.findUnique({ where: { memberCode: m.code } });
    if (existing) {
      await prisma.member.update({
        where: { id: existing.id },
        data: {
          trainerId: existing.trainerId ?? assignedTrainer.id,
          trainerFee: Number(existing.trainerFee) > 0 ? existing.trainerFee : m.trainerFee,
          ...(existing.passwordHash ? {} : { passwordHash: memberPassword, portalActivatedAt: now }),
        },
      });
      continue;
    }

    const plan = createdPlans[m.planIdx];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (12 - i));

    const endDate = new Date(startDate);
    if (m.status === "EXPIRED") {
      endDate.setDate(now.getDate() - 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const member = await prisma.member.create({
      data: {
        memberCode: m.code,
        firstName: m.first,
        lastName: m.last,
        email: m.email,
        phone: m.phone,
        status: m.status,
        trainerId: assignedTrainer.id,
        trainerFee: m.trainerFee,
        passwordHash: memberPassword,
        portalActivatedAt: startDate,
        joinedAt: startDate,
      },
    });

    const membership = await prisma.membership.create({
      data: {
        memberId: member.id,
        planId: plan.id,
        planNameSnapshot: plan.name,
        priceSnapshot: plan.price,
        startDate,
        endDate,
        status: m.status === "EXPIRED" ? "EXPIRED" : "ACTIVE",
        isRenewal: i % 3 === 0,
      },
    });

    await prisma.payment.create({
      data: {
        receiptNumber: `RCP-SEED-${1001 + i}`,
        memberId: member.id,
        membershipId: membership.id,
        recordedById: primaryAdmin.id,
        amount: plan.price,
        method: i % 3 === 0 ? "EWALLET" : i % 2 === 0 ? "CARD" : "CASH",
        status: "PAID",
        paidAt: startDate,
        notes: "Over-the-counter payment",
      },
    });

    const { rawToken, tokenHash, tokenLast4 } = generateOpaqueQrToken();
    await prisma.qRCredential.create({
      data: {
        memberId: member.id,
        tokenHash,
        tokenLast4,
        tokenCiphertext: encryptQrToken(rawToken),
        isActive: m.status === "ACTIVE",
      },
    });

    if (m.status === "ACTIVE") {
      await prisma.attendanceRecord.create({
        data: {
          memberId: member.id,
          recordedById: assignedTrainer.id,
          method: i % 2 === 0 ? "QR" : "MANUAL",
          outcome: "APPROVED",
          checkedInAt: new Date(now.getTime() - i * 45 * 60 * 1000),
        },
      });
    }
  }

  console.log("IronHub seed completed (3-role model: Admin, Trainor, Client).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
