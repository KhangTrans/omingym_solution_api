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
 * Step 1: Quản lý setup khung lịch chuẩn 7 ngày cho 1 nhân viên.
 * Mỗi ngày 1 record, gán shift_id (Ca 1, Ca 2, ...). Ngày nghỉ cố định để shift_id null.
 * Hàm này upsert toàn bộ 7 ngày cho user_id.
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

    // Validate đủ 7 ngày, không trùng lặp.
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

    if (seenDays.size !== 7) {
      throw new Error('Vui lòng khai báo đầy đủ 7 ngày trong tuần.');
    }

    // Validate shift_id tồn tại (nếu có).
    const shiftIds = dto.items
      .map((it) => it.shift_id)
      .filter((id): id is number => typeof id === 'number');

    if (shiftIds.length > 0) {
      const shifts = await shiftRepo.find({ where: { id: In(shiftIds) } });
      if (shifts.length !== new Set(shiftIds).size) {
        throw new Error('Có ca trực không tồn tại trong hệ thống.');
      }
    }

    // Xoá khung cũ rồi insert lại để đảm bảo đủ 7 record.
    await baseRepo.delete({ user_id: dto.user_id });

    const records = dto.items.map((it) =>
      baseRepo.create({
        user_id: dto.user_id,
        day_of_week: it.day_of_week,
        shift_id: it.shift_id ?? null,
      }),
    );

    const saved = await baseRepo.save(records);

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
