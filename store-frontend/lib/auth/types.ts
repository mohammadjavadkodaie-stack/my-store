/**
 * Shape of the user object returned by the backend auth endpoints
 * (POST /auth/login, POST /auth/register and GET /auth/me).
 *
 * Mirrors the backend `UserEntity` (store-backend/src/auth/entities/user.entity.ts):
 * the JWT lives only in the httpOnly cookie, so exactly these fields ever
 * arrive in an auth response.
 */

/** Values of the backend Prisma `Role` enum used by the auth endpoints. */
export type AuthUserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  role: AuthUserRole;
  /**
   * Whether this visitor is the site owner (the holder of the global
   * on/off switch). Computed by the backend on every request from the owner
   * phone in its own environment — the phone itself is never sent to this
   * frontend, so this boolean is the only owner fact available here.
   */
  isOwner: boolean;
}
