import { TrainerLevel } from "../models/trainer-status.enum.js";

export class CreateTrainerApplicationDto {
  branch_id!: number;
  desired_level!: TrainerLevel;
  bio?: string;
  specialization!: string;
  avatar_url!: string;
  phone_number!: string;
  address!: string;
  years_experience?: number;
  hourly_rate?: number;
  identity_number!: string;
  identity_image_url!: string;
  certificates!: CreateTrainerApplicationCertificateDto[];
}

export class CreateTrainerApplicationCertificateDto {
  cert_name!: string;
  issued_by!: string;
  certificate_number!: string;
  image_url!: string;
  issued_at?: string;
  expires_at!: string;
}
