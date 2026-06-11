import { Router } from 'express';
import {
  customerCheckInHandler,
  getMyCheckInLogsHandler,
  getCustomerCheckInLogsForAdminHandler,
  getCustomerCheckInLogsForBranchHandler,
} from '../controllers/customer-check-in.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Khách hàng thực hiện check-in
router.post('/check-in', isAuthenticated, authorizeRole(['Customer']), customerCheckInHandler);

// Khách hàng tự xem lịch sử check-in của chính mình
router.get('/my-logs', isAuthenticated, authorizeRole(['Customer']), getMyCheckInLogsHandler);

// Admin xem lịch sử check-in của toàn bộ hệ thống
router.get('/admin', isAuthenticated, authorizeRole(['Admin']), getCustomerCheckInLogsForAdminHandler);

// BranchManager và Staff xem lịch sử check-in của chi nhánh mình phụ trách
router.get('/branch', isAuthenticated, authorizeRole(['BranchManager', 'Staff']), getCustomerCheckInLogsForBranchHandler);

export default router;
