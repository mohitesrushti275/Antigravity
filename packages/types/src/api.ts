// ═══════════════════════════════════════════════════
// SHARED API TYPES
// packages/types/src/api.ts
// ═══════════════════════════════════════════════════

// Standard success envelope
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
}

// Standard error envelope
export interface ApiError {
  error: string;      // human-readable message
  code: ApiErrorCode; // machine-readable constant
  details?: unknown;  // zod errors, field info, etc.
  traceId?: string;   // correlates to logs
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

/** Backward-compatible alias used by the web app's response helper. */
export type ErrorCode = ApiErrorCode;

// Pagination
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  cursor?: string;
}

// Search params
export interface SearchParams {
  q?: string;
  category?: string;
  sort?: "popular" | "newest" | "trending";
  page?: number;
  limit?: number;
}

// Magic generation request
export interface GenerateRequest {
  prompt: string;
  currentFile?: string;
  projectDeps: string[];
  framework: "next" | "vite" | "remix";
  tailwindConfig?: string;
}

// SSE stream events
export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; tokensUsed: number }
  | { type: "error"; message: string };

// Upload flow
export interface PresignRequest {
  componentId: string;
  fileType: string;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

export interface PresignResponse {
  uploadUrl: string;
  r2Key: string;
}

export interface ConfirmRequest {
  componentId: string;
  fileKeys: string[];
}
