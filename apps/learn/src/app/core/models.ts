export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Lesson {
  id: string;
  title: string;
  prompt: string;
  translation: string | null;
  level: string;
  audioKey: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
