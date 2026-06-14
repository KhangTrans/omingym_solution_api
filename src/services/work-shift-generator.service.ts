import { Between, EntityManager, In } from 'typeorm';
import crypto from 'crypto';
import { AppDataSource } from '../config/data-source.js';
import { BaseSchedule } from '../models/base-schedule.entity.js';
import { TimeOffRequest } from '../models/time-off-request.entity.js';
import { WorkShift } from '../models/work-shift.entity.js';
import { Staff } from '../models/staff.entity.js';
import { Trainer } from '../models/trainer.entity.js';
import { User } from '../models/user.entity.js';
import {
  TimeOffRequestStatus,
  WorkShiftStatus,
} from '../models/work-shift-status.enum.js';

const ACTIVE_USER_STATUS = 'active';

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

  // Job chạy 00h00 thứ 7 -> "tuần kế tiếp" là Mon -> Sun ngay sau đó.
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
 * Parse 'YYYY-MM-DD' về Date local (giờ 00:00) để so sánh đúng theo lịch.
 */
const parseDateOnly = (value: string): Date => {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error('Định dạng ngày không hợp lệ. Vui lòng nhập YYYY-MM-DD.');
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Ngày không hợp lệ.');
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Trả về Chủ Nhật cùng tuần với startDate (theo chuẩn tuần Mon..Sun).
 */
const getEndOfWeek = (startDate: Date): Date => {
  const dow = isoDayOfWeek(startDate); // 1..7
  const offsetToSunday = 7 - dow; // nếu Chủ Nhật thì 0
  const end = new Date(startDate);
  end.setDate(end.getDate() + offsetToSunday);
  end.setHours(0, 0, 0, 0);
  return end;
};

/**
 * Sinh dải ngày Dương lịch [start..end] (cùng giờ 00:00).
 */
const buildDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

/**
 * Step 2: Kích hoạt lịch tuần đầu cho 1 nhân viên mới.
 * - Nhận user_id + start_date (YYYY-MM-DD).
 * - Sinh work_shifts từ start_date -> hết Chủ Nhật cùng tuần.
 * - Đối chiếu base_schedules để biết ngày nào ca nào.
 * - Đối chiếu time_off_requests đã approve -> off_approved.
 * - Idempotent: nếu work_shift cùng (user_id, date) đã tồn tại thì giữ nguyên.
 */
export const activateFirstWeekWorkShifts = async (
  userId: number,
  startDateStr: string,
) => {
  const startDate = parseDateOnly(startDateStr);
  const endDate = getEndOfWeek(startDate);
  const dates = buildDateRange(startDate, endDate);

  return AppDataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const baseRepo = manager.getRepository(BaseSchedule);
    const requestRepo = manager.getRepository(TimeOffRequest);
    const shiftRepo = manager.getRepository(WorkShift);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Không tìm thấy nhân viên.');
    }
    if (user.status && user.status !== ACTIVE_USER_STATUS) {
      throw new Error('Nhân viên chưa active, không thể kích hoạt lịch.');
    }

    const branchId = await resolveBranchIdForUser(manager, userId);
    if (!branchId) {
      throw new Error('Nhân viên chưa được gán chi nhánh.');
    }

    const baseSchedules = await baseRepo.find({
      where: { user_id: userId },
      relations: { shift: true },
    });
    if (baseSchedules.length === 0) {
      throw new Error('Nhân viên chưa có khung lịch chuẩn. Vui lòng setup trước.');
    }

    const dayMap = new Map<number, BaseSchedule>();
    for (const s of baseSchedules) {
      dayMap.set(s.day_of_week, s);
    }

    const approvedOffs = await requestRepo.find({
      where: {
        user_id: userId,
        date: Between(startDate, endDate),
        status: TimeOffRequestStatus.Approved,
      },
    });
    const offSet = new Set<string>();
    for (const req of approvedOffs) {
      const dateStr = formatDate(
        req.date instanceof Date ? req.date : new Date(req.date),
      );
      offSet.add(dateStr);
    }

    const existingShifts = await shiftRepo.find({
      where: {
        user_id: userId,
        date: Between(startDate, endDate),
      },
    });
    const existingMap = new Map<string, WorkShift>();
    for (const ws of existingShifts) {
      const dateStr = formatDate(
        ws.date instanceof Date ? ws.date : new Date(ws.date),
      );
      existingMap.set(dateStr, ws);
    }

    let generated = 0;
    let offApproved = 0;
    let skipped = 0;

    for (const date of dates) {
      const dateStr = formatDate(date);
      const existing = existingMap.get(dateStr);
      const isOff = offSet.has(dateStr);

      if (existing) {
        if (isOff && existing.status === WorkShiftStatus.Scheduled) {
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

      if (isOff) {
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

      // Ngày nghỉ cố định trong khung -> không tạo work_shift.
      if (!baseDay || !baseDay.shift_id) {
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

    return {
      generated,
      off_approved: offApproved,
      skipped,
      range: { start: formatDate(startDate), end: formatDate(endDate) },
    };
  });
};

/**
 * Step 3: Sinh lịch thực tế cho tuần kế tiếp.
 * - Quét nhân viên đang Active trong hệ thống.
 * - Lấy base_schedules của từng người làm móng.
 * - Đối chiếu time_off_requests đã approve -> work_shifts(off_approved).
 * - Còn lại lấy ca từ khung -> work_shifts(scheduled).
 * - Idempotent: nếu work_shift cùng (user_id, date) đã tồn tại thì giữ nguyên,
 *   trừ trường hợp cần chuyển scheduled -> off_approved khi đơn nghỉ vừa duyệt sau đó.
 */
export const generateNextWeekWorkShifts = async (anchor: Date = new Date()) => {
  const { start, end, dates } = getNextWeekRange(anchor);

  return AppDataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const baseRepo = manager.getRepository(BaseSchedule);
    const requestRepo = manager.getRepository(TimeOffRequest);
    const shiftRepo = manager.getRepository(WorkShift);

    // Chỉ lấy nhân viên đang Active để sinh lịch.
    const activeUsers = await userRepo.find({
      where: { status: ACTIVE_USER_STATUS },
      select: { id: true },
    });
    const activeUserIds = activeUsers.map((u) => u.id);

    if (activeUserIds.length === 0) {
      return {
        generated: 0,
        off_approved: 0,
        skipped: 0,
        range: { start: formatDate(start), end: formatDate(end) },
      };
    }

    // Base schedules của các nhân viên đang Active.
    const baseSchedules = await baseRepo.find({
      where: { user_id: In(activeUserIds) },
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
        if (!baseDay || !baseDay.shift_id) {
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
