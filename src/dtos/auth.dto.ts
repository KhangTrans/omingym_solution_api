export interface RequestOTPDto {
  identifier: string; // email or phone number
}

export interface VerifyOTPDto {
  identifier: string;
  otp: string;
}

export interface CompleteRegistrationDto {
  identifier: string;
  otp: string;
  password: string;
  personalInfo?: {
    full_name: string;
    dob?: string;
    gender?: string;
    height?: number;
    weight?: number;
    workout_goal?: string;
    medical_history?: string;
  };
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface GoogleLoginDto {
  idToken: string;
}

export interface RegisterUserDto {
  email?: string;
  phone_number?: string;
  password: string;
  full_name: string;
  dob?: Date;
  gender?: string;
  height?: number;
  weight?: number;
  workout_goal?: string;
  medical_history?: string;
  role_id: number;
}
