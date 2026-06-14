export interface CreateWorkShiftDto {
  user_id: number;
  branch_id: number;
  date: string; // YYYY-MM-DD
  shift_id?: number | null;
  check_in_code?: string;
}

export interface UpdateWorkShiftDto {
  date?: string;
  shift_id?: number | null;
  status?: string; // 'scheduled' | 'off_approved' | 'completed' | 'cancelled'
  check_in_code?: string;
}

export interface GetWorkShiftsQueryDto {
  date?: string;
  user_id?: number;
  branch_id?: number;
  status?: string;
}
