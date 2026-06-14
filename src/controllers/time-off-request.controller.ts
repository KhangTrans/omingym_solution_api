import { Request, Response } from 'express';
import {
  createTimeOffRequest,
  getTimeOffRequests,
  getMyTimeOffRequests,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  cancelMyTimeOffRequest,
} from '../services/time-off-request.service.js';
import {
  CreateTimeOffRequestDto,
  GetTimeOffRequestsQueryDto,
} from '../dtos/time-off-request.dto.js';
import { TimeOffRequestStatus } from '../models/work-shift-status.enum.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validateCreateBody = (body: any): string | null => {
  if (!body || typeof body !== 'object') {
    return 'Dữ liệu không hợp lệ.';
  }
  if (!body.date || !DATE_REGEX.test(body.date)) {
    return 'Vui lòng chọn ngày xin nghỉ hợp lệ (YYYY-MM-DD).';
  }
  if (body.reason !== undefined && typeof body.reason !== 'string') {
    return 'Lý do không hợp lệ.';
  }
  return null;
};

export const createTimeOffRequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const validationError = validateCreateBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const dto: CreateTimeOffRequestDto = {
      date: req.body.date,
      reason: req.body.reason,
    };

    const result = await createTimeOffRequest(userId, dto);

    return res.status(201).json({
      message: 'Nộp đơn xin nghỉ thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getTimeOffRequestsHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const query: GetTimeOffRequestsQueryDto = {};

    if (user.role === 'Staff' || user.role === 'Trainer') {
      query.user_id = user.id;
    } else if (req.query.user_id) {
      query.user_id = Number(req.query.user_id);
    }

    if (req.query.branch_id) {
      query.branch_id = Number(req.query.branch_id);
    }
    if (req.query.status) {
      query.status = String(req.query.status);
    }
    if (req.query.month) {
      query.month = String(req.query.month);
    }

    const data = await getTimeOffRequests(query);
    return res.json({ data });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMyTimeOffRequestsHandler = async (req: Request, res: Response) => {
  try {
    const data = await getMyTimeOffRequests(req.user!.id);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveTimeOffRequestHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID đơn không hợp lệ.' });
    }

    const result = await approveTimeOffRequest(id, req.user!.id);
    return res.json({
      message: 'Duyệt đơn xin nghỉ thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const rejectTimeOffRequestHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID đơn không hợp lệ.' });
    }

    const rejectionReason: string | undefined = req.body?.rejection_reason;
    const result = await rejectTimeOffRequest(id, req.user!.id, rejectionReason);
    return res.json({
      message: 'Từ chối đơn xin nghỉ thành công.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const cancelMyTimeOffRequestHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID đơn không hợp lệ.' });
    }

    await cancelMyTimeOffRequest(req.user!.id, id);
    return res.json({ message: 'Hủy đơn xin nghỉ thành công.' });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
