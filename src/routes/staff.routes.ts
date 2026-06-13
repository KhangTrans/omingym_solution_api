import { Router } from 'express';
import { createStaffHandler, getStaffListHandler, updateStaffStatusHandler } from '../controllers/staff.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Admin tạo tài khoản Staff mới
router.post(
  '/',
  isAuthenticated,
  authorizeRole(['Admin']),
  createStaffHandler,
);

// Admin xem danh sách Staff
router.get(
  '/',
  isAuthenticated,
  authorizeRole(['Admin']),
  getStaffListHandler,
);

// Admin khóa/mở khóa tài khoản Staff
router.patch(
  '/:id/status',
  isAuthenticated,
  authorizeRole(['Admin']),
  updateStaffStatusHandler,
);

export default router;
