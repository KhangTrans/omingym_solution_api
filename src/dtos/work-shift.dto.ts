export interface CreateWorkShiftDto {
  user_id: number;
  branch_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  check_in_code?: string;
}

export interface UpdateWorkShiftDto {
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: string; // 'scheduled', 'completed', 'cancelled'
  check_in_code?: string;
}

export interface GetWorkShiftsQueryDto {
  date?: string;
  user_id?: number;
  branch_id?: number;
}
