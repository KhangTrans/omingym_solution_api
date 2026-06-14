import { Router } from 'express';
import { getShiftsHandler, getShiftByIdHandler } from '../controllers/shift.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// Đọc danh sách ca trực để dùng khi setup base schedule / chọn ca làm việc.
router.get('/', isAuthenticated, getShiftsHandler);
router.get('/:id', isAuthenticated, getShiftByIdHandler);

export default router;
