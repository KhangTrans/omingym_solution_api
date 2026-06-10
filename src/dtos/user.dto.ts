export interface UpdateProfileDto {
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  dob?: string | Date;
  height?: number;
  weight?: number;
  workout_goal?: string;
  medical_history?: string;
  gender?: string;
  age?: number;
  // Trainer fields
  specialization?: string;
  bio?: string;
  experience_years?: number;
  // Partner fields
  company_name?: string;
  tax_code?: string;
  business_license?: string;
  description?: string;
  tag_line?: string;
  logo_url?: string;
  // Staff fields
  department?: string;
  branch_id?: number;
}

export interface CreateUserDto {
  name: string;
}

export interface RegisterFaceEmbeddingDto {
  face_vector?: number[];
  image_base64?: string;
}
