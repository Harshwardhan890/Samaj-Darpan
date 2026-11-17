export interface FieldErrors {
  [field: string]: string[];
}

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;
  payload: unknown;

  constructor(
    message: string,
    status: number,
    fieldErrors: FieldErrors = {},
    payload: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.payload = payload;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const body = payload as
      | { error?: string; message?: string; fieldErrors?: FieldErrors }
      | null;
    throw new ApiError(
      body?.error ?? body?.message ?? `Request failed (${response.status}).`,
      response.status,
      body?.fieldErrors ?? {},
      payload,
    );
  }
  return payload as T;
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Convert a server-generated absolute link (which may use the API origin and
 * port) into a path the client router can navigate to. Without this, React
 * Router rejects the link as an external navigation in development.
 */
export function toAppPath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}
