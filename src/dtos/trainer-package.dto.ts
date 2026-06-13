export class CreateTrainerPackageDto {
  package_name!: string;
  session_count!: number;
  package_price!: number;
  trainer_level!: string;
  mode!: string;
  description?: string;
  is_active?: boolean;
}

export class UpdateTrainerPackageDto {
  package_name?: string;
  session_count?: number;
  package_price?: number;
  trainer_level?: string;
  mode?: string;
  description?: string;
  is_active?: boolean;
}
