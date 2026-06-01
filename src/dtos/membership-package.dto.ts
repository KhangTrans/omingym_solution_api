export class CreateMembershipPackageDto {
  name!: string;
  price!: number;
  duration_months!: number;
  description?: string;
  benefits?: string;
  status?: string;
  branch_ids?: number[]; // Nếu rỗng [] hoặc không gửi → apply tất cả chi nhánh
}

export class UpdateMembershipPackageDto {
  name?: string;
  price?: number;
  duration_months?: number;
  description?: string;
  benefits?: string;
  status?: string;
  branch_ids?: number[];
}
