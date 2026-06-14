export interface BaseScheduleItemDto {
  day_of_week: number; // 1..7 (1 = Mon, 7 = Sun)
  shift_id?: number | null;
}

export interface SetupBaseSchedulesDto {
  user_id: number;
  items: BaseScheduleItemDto[];
}

export interface UpdateBaseScheduleDto {
  shift_id?: number | null;
}
