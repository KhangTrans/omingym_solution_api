export interface CheckInDto {
  shift_id: number;
  check_in_code?: string;
  dynamic_qr_token?: string;
}

export interface CheckOutDto {
  shift_id?: number;
}

export interface UpdateAttendanceDto {
  check_in_time?: string | Date;
  check_out_time?: string | Date;
  status?: string; // 'present', 'late', 'absent', 'half_day'
  notes?: string;
}

export interface GetAttendanceQueryDto {
  date?: string;
  user_id?: number;
  branch_id?: number;
  status?: string;
}
