import { IsNotEmpty, IsString, IsOptional, IsInt, IsArray, ValidateNested, IsBoolean } from 'class-validator';
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
}

export class CreateBranchDto {
  @IsNotEmpty()
  @IsInt()
  partner_id!: number;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchImageDto)
  images?: BranchImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchFacilityDto)
  facilities?: BranchFacilityDto[];
}
