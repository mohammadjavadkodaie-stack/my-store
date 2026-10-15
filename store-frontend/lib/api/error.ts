/**
 * Typed error thrown by every helper in this folder.
 *
 * Non-2xx responses become an ApiError carrying the backend's own message
 * (NestJS default body: `{ message, error, statusCode }`) so callers can show a
 * real text instead of a generic failure.
 *
 * Security: the raw response body is never attached to the error nor logged —
 * it can contain user data; only the backend's own `message` is kept.
 */

/** NestJS default error body. */
export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface ApiErrorInit {
  /** HTTP status, or 0 when the request never reached the backend. */
  status: number;
  /** Requested URL (the path only for client-side calls). */
  url: string;
  message: string;
  /** Backend `error` field, e.g. "Not Found". */
  code?: string;
  /** Backend `message` when it is an array (class-validator messages). */
  details?: string[];
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly code?: string;
  readonly details?: string[];

  constructor(init: ApiErrorInit) {
    super(
      init.message,
      init.cause === undefined ? undefined : { cause: init.cause },
    );
    this.name = "ApiError";
    this.status = init.status;
    this.url = init.url;
    this.code = init.code;
    this.details = init.details;
  }

  /** 400 carrying one message per invalid field. */
  get isValidationError(): boolean {
    return this.status === 400 && (this.details?.length ?? 0) > 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** The request never reached the backend (offline, DNS, abort, ...). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Builds an ApiError from a non-2xx response. A body that is not the NestJS
   * shape (HTML error page, empty body, ...) falls back to a generic message.
   */
  static async fromResponse(response: Response, url: string): Promise<ApiError> {
    let body: ApiErrorBody | undefined;
    try {
      body = parseApiErrorBody(await response.json());
    } catch {
      body = undefined;
    }
    const details = Array.isArray(body?.message) ? body.message : undefined;
    const message =
      typeof body?.message === "string" && body.message.length > 0
        ? body.message
        : (details?.[0] ?? `خطای سرور (${response.status})`);
    return new ApiError({
      status: response.status,
      url,
      message,
      code: body?.error,
      details,
    });
  }

  /** Network-level failure: no HTTP response at all, hence status 0. */
  static network(url: string, cause?: unknown): ApiError {
    return new ApiError({
      status: 0,
      url,
      code: "NETWORK_ERROR",
      message: "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.",
      cause,
    });
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Reads the NestJS error shape out of an unknown JSON value, ignoring the rest. */
export function parseApiErrorBody(value: unknown): ApiErrorBody | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const body: ApiErrorBody = {};
  if (typeof raw.message === "string") {
    body.message = raw.message;
  } else if (
    Array.isArray(raw.message) &&
    raw.message.every((item) => typeof item === "string")
  ) {
    body.message = raw.message as string[];
  }
  if (typeof raw.error === "string") {
    body.error = raw.error;
  }
  if (typeof raw.statusCode === "number") {
    body.statusCode = raw.statusCode;
  }
  return Object.keys(body).length > 0 ? body : undefined;
}
