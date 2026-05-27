import { Router } from 'express';
import { 
  requestOTP, 
  completeRegistration, 
  login, 
  googleLogin,
  logout, 
  getProfile, 
  forgotPassword, 
  resetPassword,
  changePassword
} from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/request-otp', requestOTP);
router.post('/register', completeRegistration);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/logout', logout);
router.get('/me', getProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', isAuthenticated, changePassword);

export default router;
