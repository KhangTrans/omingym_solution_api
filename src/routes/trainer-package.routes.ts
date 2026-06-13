import { Router } from 'express';
import { getAllTrainerPackages, getTrainerPackageById, createNewTrainerPackage, updateTrainerPackageById } from '../controllers/trainer-package.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getAllTrainerPackages);
router.get('/:id', getTrainerPackageById);
router.post('/', isAuthenticated, authorizeRole(['Admin']), createNewTrainerPackage);
router.put('/:id', isAuthenticated, authorizeRole(['Admin']), updateTrainerPackageById);

export default router;
