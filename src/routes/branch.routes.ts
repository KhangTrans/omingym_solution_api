import { Router } from 'express';
import { createBranch, getBranches } from '../controllers/branch.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

// To be secure, you might want to add authorizeRole(['Partner', 'Admin']) here later
router.post('/', isAuthenticated, createBranch);
router.get('/', getBranches);

export default router;
