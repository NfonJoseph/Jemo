import { getToken } from "./auth";

const isDev = process.env.NODE_ENV === "development";

// Use Next.js proxy to avoid CORS issues - /api/* is rewritten to backend
const API_URL = typeof window !== "undefined" 
  ? "/api" 
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

// Dev-only warning if env var is missing server-side
if (isDev && typeof window === "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "[API] NEXT_PUBLIC_API_URL not set - defaulting to http://localhost:3001\n" +
    "      Set in apps/web/.env.local: NEXT_PUBLIC_API_URL=http://localhost:3001"
  );
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
    public rawBody?: string
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, auth = false } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...headers,
  };

  // Auto-attach auth header if token exists and auth is requested
  if (auth) {
    const token = getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
    if (isDev) {
      console.log(`[API] Auth requested, token present: ${!!token}`);
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    cache: "no-store",
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const url = `${API_URL}${endpoint}`;
  if (isDev) {
    console.log(`[API] ${method} ${url}`);
    console.log(`[API] Headers:`, {
      ...requestHeaders,
      Authorization: requestHeaders["Authorization"] ? "[PRESENT]" : "[NONE]",
    });
    if (body) {
      // Redact password in logs
      const logBody = { ...body as Record<string, unknown> };
      if ("password" in logBody) {
        logBody.password = "[REDACTED]";
      }
      console.log(`[API] Request body:`, JSON.stringify(logBody, null, 2));
    }
  }

  try {
    const response = await fetch(url, config);

    if (isDev) {
      console.log(`[API] Response status: ${response.status}`);
    }

    if (!response.ok) {
      const rawText = await response.text();
      let errorData: unknown = null;
      
      try {
        errorData = rawText ? JSON.parse(rawText) : null;
      } catch {
        errorData = null;
      }
      
      if (isDev) {
        console.error(`[API] Error ${response.status}:`, errorData || rawText);
      }
      
      throw new ApiError(response.status, response.statusText, errorData, isDev ? rawText : undefined);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err) {
    if (isDev && err instanceof TypeError) {
      console.error(`[API] Network error - Check if API is running at ${API_URL} or CORS config`);
    }
    throw err;
  }
}

export const api = {
  get: <T>(endpoint: string, auth = false) =>
    request<T>(endpoint, { method: "GET", auth }),

  post: <T>(endpoint: string, body?: unknown, auth = false) =>
    request<T>(endpoint, { method: "POST", body, auth }),

  put: <T>(endpoint: string, body?: unknown, auth = false) =>
    request<T>(endpoint, { method: "PUT", body, auth }),

  patch: <T>(endpoint: string, body?: unknown, auth = false) =>
    request<T>(endpoint, { method: "PATCH", body, auth }),

  delete: <T>(endpoint: string, auth = false) =>
    request<T>(endpoint, { method: "DELETE", auth }),
};

export { ApiError };

