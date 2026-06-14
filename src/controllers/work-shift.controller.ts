import { Request, Response } from 'express';
import {
  createShift,
  fetchShifts,
  fetchShiftById,
  updateShift,
  deleteShift,
} from '../services/work-shift.service.js';
import {
  activateFirstWeekWorkShifts,
  generateNextWeekWorkShifts,
} from '../services/work-shift-generator.service.js';
import {
  ActivateFirstWeekDto,
  CreateWorkShiftDto,
  GetWorkShiftsQueryDto,
  UpdateWorkShiftDto,
} from '../dtos/work-shift.dto.js';
import { WorkShiftStatus } from '../models/work-shift-status.enum.js';

export const createShiftHandler = async (req: Request, res: Response) => {
  try {
    const { user_id, branch_id, date, shift_id, check_in_code }: CreateWorkShiftDto = req.body;

    if (!user_id || !branch_id || !date) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đầy đủ thông tin: user_id, branch_id, date.',
      });
    }

    if (shift_id !== undefined && shift_id !== null && Number(shift_id) <= 0) {
      return res.status(400).json({ message: 'shift_id không hợp lệ.' });
    }

    const shift = await createShift({
      user_id,
      branch_id,
      date,
      shift_id: shift_id ?? null,
      check_in_code,
    });

    res.status(201).json({
      message: 'Tạo ca làm việc thành công.',
      data: shift,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getShiftsHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const query: GetWorkShiftsQueryDto = {};

    if (user.role === 'Staff' || user.role === 'Trainer') {
      // Staff và Trainer chỉ xem được ca của mình
      query.user_id = user.id;
    } else {
      // Admin hoặc BranchManager có thể lọc
      if (req.query.user_id) {
        query.user_id = Number(req.query.user_id);
      }
    }

    if (req.query.branch_id) {
      query.branch_id = Number(req.query.branch_id);
    }
    if (req.query.date) {
      query.date = String(req.query.date);
    }
    if (req.query.status) {
      query.status = String(req.query.status);
    }

    const shifts = await fetchShifts(query);
    res.json({ data: shifts });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getShiftByIdHandler = async (req: Request, res: Response) => {
  try {
    const shiftId = Number(req.params.id);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return res.status(400).json({ message: 'ID ca làm việc không hợp lệ.' });
    }

    const shift = await fetchShiftById(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });
    }

    const user = req.user!;
    // Phân quyền: Staff/Trainer chỉ xem được ca của bản thân
    if ((user.role === 'Staff' || user.role === 'Trainer') && shift.user_id !== user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem thông tin ca làm việc này.' });
    }

    res.json({ data: shift });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateShiftHandler = async (req: Request, res: Response) => {
  try {
    const shiftId = Number(req.params.id);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return res.status(400).json({ message: 'ID ca làm việc không hợp lệ.' });
    }

    const payload: UpdateWorkShiftDto = req.body;

    if (payload.status) {
      const valid = Object.values(WorkShiftStatus).includes(payload.status as WorkShiftStatus);
      if (!valid) {
        return res.status(400).json({ message: 'Trạng thái ca làm việc không hợp lệ.' });
      }
    }

    const updated = await updateShift(shiftId, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });
    }

    res.json({ message: 'Cập nhật ca làm việc thành công.', data: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteShiftHandler = async (req: Request, res: Response) => {
  try {
    const shiftId = Number(req.params.id);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return res.status(400).json({ message: 'ID ca làm việc không hợp lệ.' });
    }

    const success = await deleteShift(shiftId);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy ca làm việc để xóa.' });
    }

    res.json({ message: 'Xóa ca làm việc thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyShiftsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const query: GetWorkShiftsQueryDto = {
      user_id: userId,
    };

    if (req.query.branch_id) {
      query.branch_id = Number(req.query.branch_id);
    }
    if (req.query.date) {
      query.date = String(req.query.date);
    }

    const shifts = await fetchShifts(query);
    res.json({
      message: 'Lấy lịch làm việc cá nhân thành công.',
      data: shifts,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cho phép Admin / BranchManager chạy thủ công job sinh lịch tuần kế tiếp.
 * Hữu ích khi cần test hoặc tạo lại lịch sau khi điều chỉnh khung.
 */
export const triggerGenerateNextWeekHandler = async (req: Request, res: Response) => {
  try {
    const result = await generateNextWeekWorkShifts(new Date());
    return res.json({
      message: 'Sinh lịch tuần kế tiếp thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * Step 2: Kích hoạt lịch tuần đầu cho nhân viên mới.
 * Body: { user_id: number, start_date: 'YYYY-MM-DD' }
 * - Sinh work_shifts từ start_date đến hết Chủ Nhật cùng tuần dựa trên base_schedules.
 */
const validateActivateFirstWeekBody = (body: any): string | null => {
  if (!body || typeof body !== 'object') {
    return 'Dữ liệu không hợp lệ.';
  }

  const { user_id, start_date } = body;

  if (!user_id || Number(user_id) <= 0) {
    return 'Vui lòng chọn nhân viên cần kích hoạt lịch.';
  }

  if (!start_date || typeof start_date !== 'string') {
    return 'Vui lòng chọn ngày bắt đầu đi làm.';
  }

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(start_date)) {
    return 'Định dạng ngày bắt đầu không hợp lệ. Vui lòng nhập YYYY-MM-DD.';
  }

  return null;
};

export const activateFirstWeekHandler = async (req: Request, res: Response) => {
  try {
    const validationError = validateActivateFirstWeekBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const dto: ActivateFirstWeekDto = {
      user_id: Number(req.body.user_id),
      start_date: String(req.body.start_date),
    };

    const result = await activateFirstWeekWorkShifts(dto.user_id, dto.start_date);

    return res.status(201).json({
      message: 'Kích hoạt lịch tuần đầu thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
