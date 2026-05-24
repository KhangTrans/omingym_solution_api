import { Router } from 'express';
import { getUsers, createUser, updateProfile } from '../controllers/user.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Route cho người dùng tự cập nhật profile cá nhân
router.put('/profile', isAuthenticated, updateProfile);

// Chỉ Admin mới được xem danh sách Users và tạo User mới
router.get('/', isAuthenticated, authorizeRole(['Admin']), getUsers);
router.post('/', isAuthenticated, authorizeRole(['Admin']), createUser);

export default router;
