import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Chỉ Admin mới được xem danh sách Users và tạo User mới
router.get('/', isAuthenticated, authorizeRole(['Admin']), getUsers);
router.post('/', isAuthenticated, authorizeRole(['Admin']), createUser);

export default router;
