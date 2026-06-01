import { Router } from 'express';
import { createFaqHandler, deleteFaqHandler, getFaqs, updateFaqHandler } from '../controllers/faq.controller.js';
import { isAuthenticated, authorizeRole } from '../middlewares/auth.middleware.js';

const router = Router();
const faqManagerRoles = ['Admin', 'Staff', 'Partner'];

router.get('/', isAuthenticated, authorizeRole(faqManagerRoles), getFaqs);
router.post('/', isAuthenticated, authorizeRole(faqManagerRoles), createFaqHandler);
router.put('/:id', isAuthenticated, authorizeRole(faqManagerRoles), updateFaqHandler);
router.delete('/:id', isAuthenticated, authorizeRole(faqManagerRoles), deleteFaqHandler);

export default router;
