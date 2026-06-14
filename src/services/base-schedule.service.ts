import { In } from 'typeorm';
import { AppDataSource } from '../config/data-source.js';
import { BaseSchedule } from '../models/base-schedule.entity.js';
import { Shift } from '../models/shift.entity.js';
import { User } from '../models/user.entity.js';
import {
  BaseScheduleItemDto,
  SetupBaseSchedulesDto,
  UpdateBaseScheduleDto,
} from '../dtos/base-schedule.dto.js';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Step 1: Quản lý setup khung lịch chuẩn cho 1 nhân viên.
 * Frontend gửi danh sách các ngày làm việc trong tuần (Thứ 2 -> Chủ Nhật).
 * Ngày nghỉ cố định thì frontend không cần gửi (hoặc gửi shift_id = null).
 * Backend chỉ lưu các record có shift_id != null, tối đa 7 dòng/user.
 * Hàm này thực hiện upsert: xoá khung cũ rồi insert lại theo dữ liệu mới.
 */
export const setupBaseSchedules = async (dto: SetupBaseSchedulesDto) => {
  return AppDataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const shiftRepo = manager.getRepository(Shift);
    const baseRepo = manager.getRepository(BaseSchedule);

    const user = await userRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new Error('Không tìm thấy nhân viên.');
    }

    // Validate day_of_week trong [1..7], không trùng lặp.
    const seenDays = new Set<number>();
    for (const item of dto.items) {
      if (!ALL_DAYS.includes(item.day_of_week)) {
        throw new Error('day_of_week phải nằm trong khoảng 1..7.');
      }
      if (seenDays.has(item.day_of_week)) {
        throw new Error('Mỗi ngày trong tuần chỉ được khai báo 1 lần.');
      }
      seenDays.add(item.day_of_week);
    }

    // Chỉ giữ các ngày có shift_id (nghĩa là ngày đi làm).
    // Ngày nghỉ cố định không lưu DB để tiết kiệm record và rõ ý nghĩa.
    const workingItems = dto.items.filter(
      (it) => it.shift_id !== null && it.shift_id !== undefined,
    );

    if (workingItems.length === 0) {
      throw new Error('Vui lòng chọn ít nhất 1 ngày đi làm trong tuần.');
    }

    // Validate shift_id tồn tại.
    const shiftIds = workingItems
      .map((it) => it.shift_id)
      .filter((id): id is number => typeof id === 'number');

    if (shiftIds.length > 0) {
      const shifts = await shiftRepo.find({ where: { id: In(shiftIds) } });
      if (shifts.length !== new Set(shiftIds).size) {
        throw new Error('Có ca trực không tồn tại trong hệ thống.');
      }
    }

    // Xoá khung cũ rồi insert lại để khớp đúng cấu hình mới.
    await baseRepo.delete({ user_id: dto.user_id });

    const records = workingItems.map((it) =>
      baseRepo.create({
        user_id: dto.user_id,
        day_of_week: it.day_of_week,
        shift_id: it.shift_id!,
      }),
    );

    await baseRepo.save(records);

    return baseRepo.find({
      where: { user_id: dto.user_id },
      relations: { shift: true },
      order: { day_of_week: 'ASC' },
    });
  });
};

export const getBaseSchedulesByUser = async (userId: number) => {
  const repo = AppDataSource.getRepository(BaseSchedule);
  return repo.find({
    where: { user_id: userId },
    relations: { shift: true },
    order: { day_of_week: 'ASC' },
  });
};

export const updateBaseScheduleDay = async (
  userId: number,
  dayOfWeek: number,
  dto: UpdateBaseScheduleDto,
) => {
  if (!ALL_DAYS.includes(dayOfWeek)) {
    throw new Error('day_of_week phải nằm trong khoảng 1..7.');
  }

  return AppDataSource.transaction(async (manager) => {
    const baseRepo = manager.getRepository(BaseSchedule);
    const shiftRepo = manager.getRepository(Shift);

    if (dto.shift_id) {
      const shift = await shiftRepo.findOne({ where: { id: dto.shift_id } });
      if (!shift) {
        throw new Error('Ca trực không tồn tại.');
      }
    }

    let record = await baseRepo.findOne({
      where: { user_id: userId, day_of_week: dayOfWeek },
    });

    if (!record) {
      record = baseRepo.create({
        user_id: userId,
        day_of_week: dayOfWeek,
      });
    }

    record.shift_id = dto.shift_id ?? null;
    return baseRepo.save(record);
  });
};
