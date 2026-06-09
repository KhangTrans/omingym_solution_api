import { Request, Response } from 'express';
import { createShift, fetchShifts, fetchShiftById, updateShift, deleteShift } from '../services/work-shift.service.js';
import { CreateWorkShiftDto, GetWorkShiftsQueryDto, UpdateWorkShiftDto } from '../dtos/work-shift.dto.js';

export const createShiftHandler = async (req: Request, res: Response) => {
  try {
    const { user_id, branch_id, date, start_time, end_time, check_in_code }: CreateWorkShiftDto = req.body;

    if (!user_id || !branch_id || !date || !start_time || !end_time) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đầy đủ thông tin: user_id, branch_id, date, start_time, end_time.',
      });
    }

    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({
        message: 'Định dạng start_time hoặc end_time không hợp lệ. Vui lòng nhập HH:mm.',
      });
    }

    const shift = await createShift({
      user_id,
      branch_id,
      date,
      start_time,
      end_time,
      check_in_code,
    });

    res.status(201).json(shift);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getShiftsHandler = async (req: Request, res: Response) => {
  try {
    const user = req.session.user!;
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

    const shifts = await fetchShifts(query);
    res.json(shifts);
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

    const user = req.session.user!;
    // Phân quyền: Staff/Trainer chỉ xem được ca của bản thân
    if ((user.role === 'Staff' || user.role === 'Trainer') && shift.user_id !== user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem thông tin ca làm việc này.' });
    }

    res.json(shift);
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

    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (payload.start_time && !timeRegex.test(payload.start_time)) {
      return res.status(400).json({ message: 'Định dạng start_time không hợp lệ. Vui lòng nhập HH:mm.' });
    }
    if (payload.end_time && !timeRegex.test(payload.end_time)) {
      return res.status(400).json({ message: 'Định dạng end_time không hợp lệ. Vui lòng nhập HH:mm.' });
    }

    const updated = await updateShift(shiftId, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
