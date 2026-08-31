/** A registered user, as returned by the backend (see CvAnalyzer.Api's UserDto). */
export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  /** "User" or "Admin" (Stage 16) — only used to show/hide the Admin nav link; the actual authorization decision is always re-checked server-side per-request. */
  role: string;
}

/** Response of POST /api/auth/register and POST /api/auth/login (AuthResponseDto). */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
