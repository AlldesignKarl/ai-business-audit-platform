import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import type { Role } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
  }
}
export class ForbiddenError extends Error {
  constructor(message = "No autorizado") {
    super(message);
  }
}

/** Jerarquía de roles: cada rol hereda los permisos de los que quedan a su derecha. */
const ROLE_RANK: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  ANALYST: 60,
  SALES: 60,
  CLIENT: 40,
  VIEWER: 20,
};

/** Recupera el usuario autenticado + su organización activa. Lanza si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

/** Exige que el usuario tenga, como mínimo, el rol indicado dentro de SU organización. */
export async function requireRole(minRole: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(`Se requiere rol ${minRole} o superior`);
  }
  return user;
}

/**
 * Verifica que un recurso con `organizationId` pertenece a la organización del
 * usuario autenticado. Nunca confíes en un organizationId recibido del cliente
 * sin pasar por aquí — así se garantiza el aislamiento multi-tenant.
 */
export function assertSameOrganization(user: SessionUser, resourceOrganizationId: string) {
  if (user.organizationId !== resourceOrganizationId) {
    throw new ForbiddenError("El recurso pertenece a otra organización");
  }
}
