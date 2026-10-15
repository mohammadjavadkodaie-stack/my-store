import { apiFetch } from "@/lib/api/client";
import type { AuthUser } from "./types";

/**
 * Auth calls for the browser ("use client" components).
 *
 * Every call goes through apiFetch, i.e. through the "/api" rewrite with
 * credentials: "include" — the backend manages the httpOnly cookie entirely,
 * and the token never reaches application code or storage.
 *
 * Request bodies contain exactly the fields of the backend DTOs
 * (store-backend/src/auth/dto): anything extra (e.g. a "role") is rejected by
 * the backend's whitelist validation.
 */

/** request-otp.dto.ts: { phone }. */
export interface RequestOtpInput {
  phone: string;
}

/** login.dto.ts: { phone, code }. */
export interface LoginInput {
  phone: string;
  code: string;
}

/** register.dto.ts: { firstName, lastName, phone, code }. */
export interface RegisterInput {
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
}

/**
 * POST /auth/otp/request — 200 with `{ registered }`, telling the visitor
 * whether that phone already has an account (which decides the next step).
 * Until the SMS provider is wired up the backend answers 503.
 */
export function requestOtp(
  input: RequestOtpInput,
): Promise<{ registered: boolean }> {
  return apiFetch<{ registered: boolean }>("/auth/otp/request", {
    method: "POST",
    body: input,
  });
}

/** POST /auth/login — 200, sets the httpOnly auth cookie, returns the user. */
export function login(input: LoginInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/login", { method: "POST", body: input });
}

/**
 * POST /auth/register — 201, returns the created user and sets the httpOnly
 * auth cookie: a successful registration signs the visitor in automatically.
 */
export function register(input: RegisterInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/register", { method: "POST", body: input });
}

/**
 * update-profile.dto.ts: { firstName, lastName }.
 *
 * Deliberately no `phone`/`role`: the backend DTO has neither, and its global
 * whitelist (forbidNonWhitelisted) answers 400 for any extra field — the user
 * id comes from the httpOnly cookie, never from the body.
 */
export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
}

/**
 * PATCH /auth/profile — 200 with the updated user (exactly the login response
 * shape), so the caller can rely on the same AuthUser type.
 */
export function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/profile", { method: "PATCH", body: input });
}

/** POST /auth/logout — 200, clears the httpOnly auth cookie. */
export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
}
