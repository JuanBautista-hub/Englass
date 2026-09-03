export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshResponse {
  ok: true;
}