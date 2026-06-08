import { Router } from 'express';
import { createPost, getAllPosts, approvePost, rejectPost, submitPostForApproval, getPostById, updatePost, deletePost } from '../controllers/post.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Mọi người có thể xem bài post đã duyệt, Admin/Staff/BranchManager có thể xem cả bài chưa duyệt
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Chỉ Staff, BranchManager, Admin mới có thể tạo bài viết
router.post('/', isAuthenticated, authorizeRole(['Staff', 'BranchManager', 'Admin']), createPost);

// Chỉ chính tác giả hoặc Admin mới được sửa/xóa
router.put('/:id', isAuthenticated, authorizeRole(['Staff', 'BranchManager', 'Admin']), updatePost);
router.delete('/:id', isAuthenticated, authorizeRole(['Staff', 'BranchManager', 'Admin']), deletePost);

// Tác giả gửi bài lên chờ duyệt
router.patch('/:id/submit', isAuthenticated, authorizeRole(['Staff', 'BranchManager', 'Admin']), submitPostForApproval);

// Admin duyệt hoặc từ chối bài viết
router.patch('/:id/approve', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), approvePost);
router.patch('/:id/reject', isAuthenticated, authorizeRole(['Admin', 'BranchManager']), rejectPost);

export default router;
