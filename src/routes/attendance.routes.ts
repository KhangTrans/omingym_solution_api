import { Router } from 'express';
import {
  checkInHandler,
  checkOutHandler,
  getMyAttendanceLogsHandler,
  getAttendanceLogsHandler,
  updateAttendanceRecordHandler,
  getBranchQrTokenHandler,
} from '../controllers/attendance.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Điểm danh check-in và check-out (bất kỳ ai đã đăng nhập đều có thể check-in/out cho ca của mình)
router.post('/check-in', isAuthenticated, checkInHandler);
router.post('/check-out', isAuthenticated, checkOutHandler);

// Nhân viên tự xem lịch sử điểm danh của bản thân
router.get('/my-logs', isAuthenticated, authorizeRole(['Staff', 'Trainer']), getMyAttendanceLogsHandler);

// Admin/BranchManager xem danh sách lịch sử điểm danh của toàn bộ phòng tập
router.get('/', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), getAttendanceLogsHandler);

// Admin/BranchManager lấy QR token động hiện tại của chi nhánh
router.get('/branch-qr/:branchId', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), getBranchQrTokenHandler);

// Admin/BranchManager sửa đổi bản ghi điểm danh (ví dụ sửa giờ vào/ra, trạng thái)
router.put('/:id', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), updateAttendanceRecordHandler);

export default router;
