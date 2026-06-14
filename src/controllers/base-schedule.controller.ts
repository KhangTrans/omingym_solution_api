import { Request, Response } from 'express';
import {
  setupBaseSchedules,
  getBaseSchedulesByUser,
  updateBaseScheduleDay,
} from '../services/base-schedule.service.js';
import {
  SetupBaseSchedulesDto,
  UpdateBaseScheduleDto,
} from '../dtos/base-schedule.dto.js';

const validateSetupBody = (body: any): string | null => {
  if (!body || typeof body !== 'object') {
    return 'Dữ liệu không hợp lệ.';
  }

  const { user_id, items } = body;

  if (!user_id || Number(user_id) <= 0) {
    return 'Vui lòng chọn nhân viên cần setup khung lịch.';
  }

  if (!Array.isArray(items) || items.length === 0) {
    return 'Vui lòng cung cấp danh sách 7 ngày trong tuần.';
  }

  for (const item of items) {
    if (
      typeof item.day_of_week !== 'number' ||
      item.day_of_week < 1 ||
      item.day_of_week > 7
    ) {
      return 'day_of_week phải nằm trong khoảng 1..7.';
    }
    if (
      item.shift_id !== null &&
      item.shift_id !== undefined &&
      Number(item.shift_id) <= 0
    ) {
      return 'shift_id không hợp lệ.';
    }
  }

  return null;
};

export const setupBaseSchedulesHandler = async (req: Request, res: Response) => {
  try {
    const validationError = validateSetupBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const dto: SetupBaseSchedulesDto = {
      user_id: Number(req.body.user_id),
      items: req.body.items.map((it: any) => ({
        day_of_week: Number(it.day_of_week),
        shift_id:
          it.shift_id === null || it.shift_id === undefined
            ? null
            : Number(it.shift_id),
      })),
    };

    const result = await setupBaseSchedules(dto);

    return res.status(201).json({
      message: 'Setup khung lịch thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getUserBaseSchedulesHandler = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID nhân viên không hợp lệ.' });
    }

    const data = await getBaseSchedulesByUser(userId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyBaseSchedulesHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await getBaseSchedulesByUser(userId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateBaseScheduleDayHandler = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const dayOfWeek = Number(req.params.dayOfWeek);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID nhân viên không hợp lệ.' });
    }

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
      return res.status(400).json({ message: 'day_of_week phải nằm trong khoảng 1..7.' });
    }

    const dto: UpdateBaseScheduleDto = {
      shift_id:
        req.body?.shift_id === null || req.body?.shift_id === undefined
          ? null
          : Number(req.body.shift_id),
    };

    const result = await updateBaseScheduleDay(userId, dayOfWeek, dto);

    return res.json({
      message: 'Cập nhật khung lịch thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
