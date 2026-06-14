import { generateNextWeekWorkShifts } from '../services/work-shift-generator.service.js';

/**
 * Scheduler nhẹ chạy ngay trong process Node hiện tại.
 * Mỗi lần kích hoạt sẽ:
 *  - Tính thời điểm 23:59 thứ 6 sắp tới.
 *  - setTimeout cho tới đúng thời điểm đó.
 *  - Chạy generateNextWeekWorkShifts() rồi tự lập lịch lại.
 */

const FRIDAY_ISO = 5; // ISO 1..7 (1 = Mon, 5 = Fri, 7 = Sun)
const TARGET_HOUR = 23;
const TARGET_MINUTE = 59;

const isoDayOfWeek = (date: Date): number => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
};

export const getNextFridayRunTime = (now: Date = new Date()): Date => {
  const next = new Date(now);
  next.setSeconds(0, 0);

  const todayIso = isoDayOfWeek(next);
  let offsetDays = (FRIDAY_ISO - todayIso + 7) % 7;

  if (offsetDays === 0) {
    // Đang là thứ 6: nếu chưa qua 23:59 thì chạy hôm nay, ngược lại lùi 7 ngày sau.
    const todayTarget = new Date(next);
    todayTarget.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);
    if (todayTarget.getTime() <= now.getTime()) {
      offsetDays = 7;
    }
  }

  next.setDate(next.getDate() + offsetDays);
  next.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);
  return next;
};

let timer: NodeJS.Timeout | null = null;

const scheduleNextRun = () => {
  const now = new Date();
  const target = getNextFridayRunTime(now);
  const delay = Math.max(target.getTime() - now.getTime(), 1000);

  // setTimeout giới hạn 32-bit -> chia thành chặng <= 24 ngày để an toàn.
  const MAX_DELAY = 1000 * 60 * 60 * 24 * 20; // 20 ngày
  if (delay > MAX_DELAY) {
    timer = setTimeout(scheduleNextRun, MAX_DELAY);
    return;
  }

  console.log(`[work-shift-scheduler] Lần chạy kế tiếp: ${target.toISOString()}`);

  timer = setTimeout(async () => {
    try {
      const result = await generateNextWeekWorkShifts(new Date());
      console.log('[work-shift-scheduler] Sinh lịch thành công:', result);
    } catch (error: any) {
      console.error('[work-shift-scheduler] Lỗi sinh lịch:', error.message);
    } finally {
      scheduleNextRun();
    }
  }, delay);
};

export const startWorkShiftScheduler = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  scheduleNextRun();
};

export const stopWorkShiftScheduler = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};
