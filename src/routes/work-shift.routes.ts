import { Router } from 'express';
import {
  createShiftHandler,
  getShiftsHandler,
  getShiftByIdHandler,
  updateShiftHandler,
  deleteShiftHandler,
  getMyShiftsHandler,
  triggerGenerateNextWeekHandler,
  activateFirstWeekHandler,
} from '../controllers/work-shift.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Xem lịch làm việc cá nhân
router.get('/me', isAuthenticated, getMyShiftsHandler);

// Step 2: Kích hoạt lịch tuần đầu cho nhân viên mới (chạy ngay sau khi setup khung lịch).
router.post(
  '/activate-first-week',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  activateFirstWeekHandler,
);

// Trigger thủ công job sinh lịch tuần kế tiếp (Step 3).
router.post(
  '/generate-next-week',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  triggerGenerateNextWeekHandler,
);

// Staff, Trainer, BranchManager, Admin đều được xem danh sách ca làm việc (phân quyền dữ liệu trong controller)
router.get('/', isAuthenticated, getShiftsHandler);

// Xem chi tiết ca làm việc
router.get('/:id', isAuthenticated, getShiftByIdHandler);

// Chỉ Admin và BranchManager mới có quyền Quản lý ca làm việc (Tạo, Sửa, Xóa)
router.post('/', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), createShiftHandler);
router.put('/:id', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), updateShiftHandler);
router.delete('/:id', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), deleteShiftHandler);

export default router;
