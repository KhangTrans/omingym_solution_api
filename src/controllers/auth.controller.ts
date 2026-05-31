import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { decryptRSA, getPublicKey } from '../utils/crypto.js';
import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import { RequestOTPDto, CompleteRegistrationDto, LoginDto, GoogleLoginDto } from '../dtos/auth.dto.js';

export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { identifier }: RequestOTPDto = req.body; // email or phone
    const result = await authService.sendOTP(identifier);
    res.json(result);
  } catch (error: any) {
    const statusCode = error.message.includes('đã được đăng ký') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const completeRegistration = async (req: Request, res: Response) => {
  try {
    const { identifier, otp, password, personalInfo, role_id }: CompleteRegistrationDto = req.body;

    // Verify OTP first
    const isOTPValid = await authService.verifyOTP(identifier, otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Mã OTP không chính xác hoặc đã hết hạn.' });
    }

    // Decrypt password sent using RSA
    let decryptedPassword = password;
    try {
      decryptedPassword = decryptRSA(password);
    } catch (error) {
      console.warn('RSA decryption failed, using password as plain text');
    }

    const user = await authService.registerUser({
      email: identifier.includes('@') ? identifier : undefined,
      phone_number: !identifier.includes('@') ? identifier : undefined,
      password: decryptedPassword,
      role_id: [3, 5].includes(Number(role_id)) ? Number(role_id) : 3, // Customer or Trainer
      full_name: personalInfo?.full_name || '',
      ...personalInfo,
      dob: personalInfo?.dob ? new Date(personalInfo.dob) : undefined
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error: any) {
    const statusCode = error.message.includes('đã được sử dụng') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password }: LoginDto = req.body;
    
    // Decrypt password sent using RSA
    let decryptedPassword = password;
    try {
      decryptedPassword = decryptRSA(password);
    } catch (error) {
      console.warn('RSA decryption failed for login, trying plain text fallback');
    }
    
    const user = await authService.loginUser(identifier, decryptedPassword);

    // Save to session
    req.session.user = {
      id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role.role_name
    };

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken }: GoogleLoginDto = req.body;
    const googlePayload = await authService.verifyGoogleToken(idToken);
    const user = await authService.loginWithGoogle(googlePayload);

    // Save to session
    req.session.user = {
      id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role.role_name
    };

    res.json({ message: 'Google login successful', user: req.session.user });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
};

export const fetchPublicKey = (req: Request, res: Response) => {
  res.json({ publicKey: getPublicKey() });
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: { 
        role: true, 
        customer: true,
        trainer: true,
        partner: true,
        staff: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't send password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await authService.initiateForgotPassword(email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // Decrypt password sent using RSA
    let decryptedNewPassword = newPassword;
    try {
      if (newPassword) decryptedNewPassword = decryptRSA(newPassword);
    } catch (error: any) {
      console.error('Failed to decrypt reset password:', error.message);
    }
    
    const result = await authService.resetPassword(email, otp, decryptedNewPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Decrypt passwords sent using RSA
    let decryptedOldPassword = oldPassword;
    let decryptedNewPassword = newPassword;
    try {
      if (oldPassword) decryptedOldPassword = decryptRSA(oldPassword);
    } catch (error: any) {
      console.error('Failed to decrypt oldPassword:', error.message);
    }

    try {
      if (newPassword) decryptedNewPassword = decryptRSA(newPassword);
    } catch (error: any) {
      console.error('Failed to decrypt newPassword:', error.message);
    }

    const result = await authService.changePassword(userId, decryptedOldPassword, decryptedNewPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
