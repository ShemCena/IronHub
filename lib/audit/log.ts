import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function writeAuditLog(
  db: DbClient,
  params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  }
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
