import { Router } from 'express';
import { getUsers, createUser, updateProfile, getProfile, updateUserStatusHandler, registerFaceEmbedding } from '../controllers/user.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Route cho người dùng tự cập nhật profile cá nhân
router.get('/profile', isAuthenticated, getProfile);
router.put('/profile', isAuthenticated, updateProfile);
router.post('/profile/face-embedding', isAuthenticated, registerFaceEmbedding);

// Admin và Staff được xem danh sách Users
router.get('/', isAuthenticated, authorizeRole(['Admin', 'Staff']), getUsers);
router.post('/', isAuthenticated, authorizeRole(['Admin']), createUser);

// Admin và Staff được khóa/mở khóa tài khoản
router.patch('/:id/status', isAuthenticated, authorizeRole(['Admin', 'Staff']), updateUserStatusHandler);

export default router;
