import { Router } from 'express';
import { createStaffHandler, getStaffListHandler } from '../controllers/staff.controller.js';
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

export default router;
