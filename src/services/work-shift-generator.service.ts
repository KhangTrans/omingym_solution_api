import { Between, EntityManager, In } from 'typeorm';
import crypto from 'crypto';
import { AppDataSource } from '../config/data-source.js';
import { BaseSchedule } from '../models/base-schedule.entity.js';
import { TimeOffRequest } from '../models/time-off-request.entity.js';
import { WorkShift } from '../models/work-shift.entity.js';
import { Staff } from '../models/staff.entity.js';
import { Trainer } from '../models/trainer.entity.js';
import {
  TimeOffRequestStatus,
  WorkShiftStatus,
} from '../models/work-shift-status.enum.js';

/**
 * Convert JavaScript Date.getDay() (0 = Sun .. 6 = Sat)
 * sang ISO 1..7 (1 = Mon .. 7 = Sun) để khớp với base_schedules.day_of_week.
 */
const isoDayOfWeek = (date: Date): number => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
};

/**
 * Trả về dải [Mon, Sun] của tuần kế tiếp tính từ thời điểm chạy job.
 */
export const getNextWeekRange = (anchor: Date = new Date()): { start: Date; end: Date; dates: Date[] } => {
  const startOfTomorrow = new Date(anchor);
  startOfTomorrow.setHours(0, 0, 0, 0);

  // Job chạy 23h59 thứ 6 -> "tuần kế tiếp" là Mon -> Sun ngay sau đó.
  // Tính số ngày tới Thứ Hai gần nhất (>= 1 ngày).
  const todayIso = isoDayOfWeek(startOfTomorrow); // 1..7
  // Số ngày cần cộng để tới thứ Hai tiếp theo (>=1)
  let offsetToMonday = ((1 - todayIso + 7) % 7);
  if (offsetToMonday === 0) {
    offsetToMonday = 7;
  }

  const start = new Date(startOfTomorrow);
  start.setDate(start.getDate() + offsetToMonday);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }

  const end = dates[dates.length - 1];
  return { start, end, dates };
};

const generateCheckInCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
};

const resolveBranchIdForUser = async (
  manager: EntityManager,
  userId: number,
): Promise<number | null> => {
  const staff = await manager.getRepository(Staff).findOne({
    where: { user_id: userId },
  });
  if (staff?.branch_id) return staff.branch_id;

  const trainer = await manager.getRepository(Trainer).findOne({
    where: { user_id: userId },
  });
  return trainer?.branch_id ?? null;
};

const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Step 3: Sinh lịch thực tế cho tuần kế tiếp.
 * - Lấy base_schedules của từng người làm móng.
 * - Đối chiếu time_off_requests đã approve -> work_shifts(off_approved).
 * - Còn lại lấy ca từ khung -> work_shifts(scheduled).
 * - Idempotent: nếu work_shift cùng (user_id, date) đã tồn tại thì giữ nguyên,
 *   trừ trường hợp cần chuyển scheduled -> off_approved khi đơn nghỉ vừa duyệt sau đó.
 */
export const generateNextWeekWorkShifts = async (anchor: Date = new Date()) => {
  const { start, end, dates } = getNextWeekRange(anchor);

  return AppDataSource.transaction(async (manager) => {
    const baseRepo = manager.getRepository(BaseSchedule);
    const requestRepo = manager.getRepository(TimeOffRequest);
    const shiftRepo = manager.getRepository(WorkShift);

    // Tất cả base schedules có trong hệ thống. Mỗi user có 7 record.
    const baseSchedules = await baseRepo.find({
      relations: { shift: true },
    });

    // Group base schedules theo user_id.
    const baseByUser = new Map<number, BaseSchedule[]>();
    for (const bs of baseSchedules) {
      const list = baseByUser.get(bs.user_id) ?? [];
      list.push(bs);
      baseByUser.set(bs.user_id, list);
    }

    if (baseByUser.size === 0) {
      return { generated: 0, off_approved: 0, skipped: 0, range: { start: formatDate(start), end: formatDate(end) } };
    }

    const userIds = [...baseByUser.keys()];

    // Tất cả đơn nghỉ approved trong tuần kế tiếp của các user này.
    const approvedRequests = await requestRepo.find({
      where: {
        user_id: In(userIds),
        date: Between(start, end),
        status: TimeOffRequestStatus.Approved,
      },
    });

    const offSet = new Set<string>();
    for (const req of approvedRequests) {
      const dateStr = formatDate(req.date instanceof Date ? req.date : new Date(req.date));
      offSet.add(`${req.user_id}|${dateStr}`);
    }

    // Đã có work_shift trong tuần này thì không tạo trùng (idempotent).
    const existingShifts = await shiftRepo.find({
      where: {
        user_id: In(userIds),
        date: Between(start, end),
      },
    });
    const existingMap = new Map<string, WorkShift>();
    for (const ws of existingShifts) {
      const dateStr = formatDate(ws.date instanceof Date ? ws.date : new Date(ws.date));
      existingMap.set(`${ws.user_id}|${dateStr}`, ws);
    }

    let generated = 0;
    let offApproved = 0;
    let skipped = 0;

    for (const [userId, schedules] of baseByUser) {
      const branchId = await resolveBranchIdForUser(manager, userId);
      if (!branchId) {
        skipped += 7;
        continue;
      }

      const dayMap = new Map<number, BaseSchedule>();
      for (const s of schedules) {
        dayMap.set(s.day_of_week, s);
      }

      for (const date of dates) {
        const key = `${userId}|${formatDate(date)}`;
        const existing = existingMap.get(key);
        const isOffApproved = offSet.has(key);

        if (existing) {
          // Đã tồn tại -> chỉ chuyển sang off_approved nếu đơn vừa duyệt.
          if (
            isOffApproved &&
            existing.status === WorkShiftStatus.Scheduled
          ) {
            existing.status = WorkShiftStatus.OffApproved;
            existing.shift_id = null;
            existing.check_in_code = undefined;
            await shiftRepo.save(existing);
            offApproved += 1;
          } else {
            skipped += 1;
          }
          continue;
        }

        const dow = isoDayOfWeek(date);
        const baseDay = dayMap.get(dow);

        if (isOffApproved) {
          const ws = shiftRepo.create({
            user_id: userId,
            branch_id: branchId,
            date: new Date(date),
            shift_id: null,
            status: WorkShiftStatus.OffApproved,
          });
          await shiftRepo.save(ws);
          offApproved += 1;
          continue;
        }

        // Ngày nghỉ cố định trong khung lịch (shift_id null) -> skip, không tạo work_shift.
        if (!baseDay || !baseDay.shift_id || !baseDay.shift) {
          skipped += 1;
          continue;
        }

        const ws = shiftRepo.create({
          user_id: userId,
          branch_id: branchId,
          date: new Date(date),
          shift_id: baseDay.shift_id,
          status: WorkShiftStatus.Scheduled,
          check_in_code: generateCheckInCode(),
        });
        await shiftRepo.save(ws);
        generated += 1;
      }
    }

    return {
      generated,
      off_approved: offApproved,
      skipped,
      range: { start: formatDate(start), end: formatDate(end) },
    };
  });
};
