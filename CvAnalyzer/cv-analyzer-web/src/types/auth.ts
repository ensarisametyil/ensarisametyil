/** A registered user, as returned by the backend (see CvAnalyzer.Api's UserDto). */
export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
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
