import { Router } from 'express';
import { createBranch, getBranches, getBranchDetail, updateBranch } from '../controllers/branch.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// To be secure, you might want to add authorizeRole(['Partner', 'Admin']) here later
router.post('/', isAuthenticated, createBranch);
router.get('/', getBranches);
router.get('/:id', getBranchDetail);
router.put('/:id', isAuthenticated, updateBranch);

export default router;
