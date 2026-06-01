import { Router } from 'express';
import { getAllPackages, getPackageById, createNewPackage, updatePackageById } from '../controllers/membership-package.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Công khai: Khách hàng xem danh sách gói
router.get('/', getAllPackages);

// Công khai: Xem chi tiết gói
router.get('/:id', getPackageById);

// Chỉ Admin/Partner mới tạo gói
router.post('/', isAuthenticated, authorizeRole(['Admin', 'Partner']), createNewPackage);

// Chỉ Admin/Partner mới cập nhật gói
router.put('/:id', isAuthenticated, authorizeRole(['Admin', 'Partner']), updatePackageById);

export default router;
