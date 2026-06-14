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

/**
 * Step 2: Kích hoạt lịch làm việc tuần đầu cho nhân viên mới.
 * `start_date` là ngày Dương lịch đầu tiên nhân viên đi làm (YYYY-MM-DD).
 * Backend sẽ sinh work_shifts từ start_date đến hết Chủ Nhật của tuần đó.
 */
export interface ActivateFirstWeekDto {
  user_id: number;
  start_date: string;
}
