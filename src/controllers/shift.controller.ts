import { Request, Response } from 'express';
import {
  getShiftTemplates,
  getShiftTemplateById,
} from '../services/shift.service.js';

export const getShiftsHandler = async (_req: Request, res: Response) => {
  try {
    const shifts = await getShiftTemplates();
    return res.json({ data: shifts });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getShiftByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID ca trực không hợp lệ.' });
    }

    const shift = await getShiftTemplateById(id);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực.' });
    }

    return res.json({ data: shift });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
