import { Router } from 'express';
import {
  createShiftHandler,
  getShiftsHandler,
  getShiftByIdHandler,
  updateShiftHandler,
  deleteShiftHandler,
} from '../controllers/work-shift.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Staff, Trainer, BranchManager, Admin đều được xem danh sách ca làm việc (phân quyền dữ liệu trong controller)
router.get('/', isAuthenticated, getShiftsHandler);

// Xem chi tiết ca làm việc
router.get('/:id', isAuthenticated, getShiftByIdHandler);

// Chỉ Admin và BranchManager mới có quyền Quản lý ca làm việc (Tạo, Sửa, Xóa)
router.post('/', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), createShiftHandler);
router.put('/:id', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), updateShiftHandler);
router.delete('/:id', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), deleteShiftHandler);

export default router;
