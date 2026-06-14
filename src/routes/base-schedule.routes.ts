import { Router } from 'express';
import {
  setupBaseSchedulesHandler,
  getUserBaseSchedulesHandler,
  getMyBaseSchedulesHandler,
  updateBaseScheduleDayHandler,
} from '../controllers/base-schedule.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Nhân viên xem khung lịch chuẩn của bản thân.
router.get('/me', isAuthenticated, getMyBaseSchedulesHandler);

// Quản lý / Admin xem khung lịch của 1 nhân viên.
router.get(
  '/users/:userId',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  getUserBaseSchedulesHandler,
);

// Quản lý setup 7 ngày/tuần cho nhân viên (chạy 1 lần khi vào làm).
router.post(
  '/setup',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  setupBaseSchedulesHandler,
);

// Quản lý chỉnh sửa ca cho 1 ngày cụ thể trong khung lịch.
router.patch(
  '/users/:userId/days/:dayOfWeek',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  updateBaseScheduleDayHandler,
);

export default router;
