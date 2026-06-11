import { IsNotEmpty, IsString, IsOptional, IsInt, IsArray, ValidateNested, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BranchImageDto {
  @IsNotEmpty()
  @IsString()
  image_url!: string;

  @IsOptional()
  @IsBoolean()
  is_cover?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class BranchFacilityImageDto {
  @IsNotEmpty()
  @IsString()
  image_url!: string;

  @IsOptional()
  @IsBoolean()
  is_cover?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class BranchFacilityDto {
  @IsNotEmpty()
  @IsString()
  facility_name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon_url?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchFacilityImageDto)
  images?: BranchFacilityImageDto[];
}

export class CreateBranchDto {
  @IsOptional()
  @IsInt()
  manager_id?: number;

  @IsNotEmpty()
  @IsString()
  branch_name!: string;

  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  hotline?: string;

  @IsNotEmpty()
  @IsString()
  province!: string;

  @IsNotEmpty()
  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  opening_house?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthly_leave_limit?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchImageDto)
  images?: BranchImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchFacilityDto)
  facilities?: BranchFacilityDto[];

  @IsOptional()
  @IsString()
  branch_ip?: string;
}
