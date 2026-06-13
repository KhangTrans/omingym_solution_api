export interface StaffDto {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
  department?: string;
  branch_id?: number;
  avatar_url?: string;
}