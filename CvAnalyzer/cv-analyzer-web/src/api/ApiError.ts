/**
 * Thrown by every cvService function for a non-2xx response or a network failure.
 * `status` is 0 for network-level failures (no HTTP response was ever received).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
