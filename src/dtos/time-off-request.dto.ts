export interface CreateTimeOffRequestDto {
  date: string; // YYYY-MM-DD
  reason?: string;
}

export interface UpdateTimeOffRequestStatusDto {
  rejection_reason?: string;
}

export interface GetTimeOffRequestsQueryDto {
  user_id?: number;
  branch_id?: number;
  status?: string;
  month?: string; // YYYY-MM
}
