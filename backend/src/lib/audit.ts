import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

export async function logAudit(
  prisma: PrismaClient,
  req: AuthRequest,
  action: string,
  entity: string,
  entityId: number | null,
  metadata?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action,
        entity,
        entityId,
        metadata: metadata || undefined,
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '',
      },
    })
  } catch {
    // never fail the request because of audit logging
  }
}
