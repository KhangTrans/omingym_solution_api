import { Router } from 'express';
import { getFaqs } from '../controllers/faq.controller.js';

const router = Router();

router.get('/', getFaqs);

export default router;