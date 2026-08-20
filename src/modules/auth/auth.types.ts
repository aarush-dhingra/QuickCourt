export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  avatar?: string | null;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface ResendOtpInput {
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatar: string | null;
    role: string;
  };
}
