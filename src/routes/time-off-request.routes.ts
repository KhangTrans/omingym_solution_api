import { Router } from 'express';
import {
  createTimeOffRequestHandler,
  getTimeOffRequestsHandler,
  getMyTimeOffRequestsHandler,
  approveTimeOffRequestHandler,
  rejectTimeOffRequestHandler,
  cancelMyTimeOffRequestHandler,
} from '../controllers/time-off-request.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Step 2: nhân viên nộp đơn xin nghỉ.
router.post('/', isAuthenticated, createTimeOffRequestHandler);

// Nhân viên xem đơn của bản thân.
router.get('/me', isAuthenticated, getMyTimeOffRequestsHandler);

// Nhân viên hủy đơn của bản thân khi còn pending.
router.delete('/:id', isAuthenticated, cancelMyTimeOffRequestHandler);

// Quản lý / Admin xem tất cả đơn (có filter).
router.get('/', isAuthenticated, getTimeOffRequestsHandler);

// Quản lý / Admin duyệt / từ chối đơn.
router.patch(
  '/:id/approve',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  approveTimeOffRequestHandler,
);
router.patch(
  '/:id/reject',
  isAuthenticated,
  authorizeRole(['Admin', 'BranchManager']),
  rejectTimeOffRequestHandler,
);

export default router;
