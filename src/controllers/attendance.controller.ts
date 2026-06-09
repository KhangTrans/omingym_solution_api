import { Request, Response } from 'express';
import {
  checkIn,
  checkOut,
  fetchAttendanceLogs,
  fetchMyAttendanceLogs,
  updateAttendanceRecord,
  generateDynamicBranchQrToken,
} from '../services/attendance.service.js';
import { CheckInDto, CheckOutDto, UpdateAttendanceDto, GetAttendanceQueryDto } from '../dtos/attendance.dto.js';

export const checkInHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { shift_id, check_in_code, dynamic_qr_token }: CheckInDto = req.body;

    if (!shift_id) {
      return res.status(400).json({ message: 'Vui lòng cung cấp shift_id để thực hiện Check-in.' });
    }
    if ((!check_in_code || !check_in_code.trim()) && (!dynamic_qr_token || !dynamic_qr_token.trim())) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mã PIN hoặc quét mã QR Check-in.' });
    }

    const attendance = await checkIn(userId, shift_id, {
      checkInCode: check_in_code,
      dynamicQrToken: dynamic_qr_token,
    });
    
    res.status(200).json({
      message: 'Check-in thành công!',
      attendance,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBranchQrTokenHandler = async (req: Request, res: Response) => {
  try {
    const branchId = Number(req.params.branchId);
    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({ message: 'ID chi nhánh không hợp lệ.' });
    }

    const token = generateDynamicBranchQrToken(branchId);
    res.json({
      branch_id: branchId,
      dynamic_qr_token: token,
      expires_in_seconds: 30, // Hết hạn sau tối đa 30-60 giây tùy thời điểm làm tròn
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkOutHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { shift_id }: CheckOutDto = req.body;

    const attendance = await checkOut(userId, shift_id);
    res.status(200).json({
      message: 'Check-out thành công!',
      attendance,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyAttendanceLogsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const logs = await fetchMyAttendanceLogs(userId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceLogsHandler = async (req: Request, res: Response) => {
  try {
    const query: GetAttendanceQueryDto = {};

    if (req.query.user_id) {
      query.user_id = Number(req.query.user_id);
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

    const logs = await fetchAttendanceLogs(query);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAttendanceRecordHandler = async (req: Request, res: Response) => {
  try {
    const attendanceId = Number(req.params.id);
    if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
      return res.status(400).json({ message: 'ID bản ghi điểm danh không hợp lệ.' });
    }

    const payload: UpdateAttendanceDto = req.body;

    const updated = await updateAttendanceRecord(attendanceId, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi điểm danh.' });
    }

    res.json({
      message: 'Cập nhật bản ghi điểm danh thành công.',
      attendance: updated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
