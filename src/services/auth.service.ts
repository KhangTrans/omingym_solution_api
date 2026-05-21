import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// OTP Structure with expiration
interface OTPData {
  otp: string;
  expiresAt: number;
}

const otpStore: Record<string, OTPData> = {};

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendOTP = async (identifier: string) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes from now

  otpStore[identifier] = { otp, expiresAt };

  // If it's an email, send via nodemailer
  if (identifier.includes('@')) {
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: identifier,
        subject: 'Mã xác thực đăng ký tài khoản OmniGym',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <div style="text-align: center;">
              <h1 style="color: #4CAF50;">OmniGym</h1>
            </div>
            <p>Chào bạn,</p>
            <p>Cảm ơn bạn đã lựa chọn <b>OmniGym</b>. Để hoàn tất việc đăng ký tài khoản, vui lòng sử dụng mã xác thực (OTP) dưới đây:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4CAF50;">
                ${otp}
              </span>
            </div>
            <p style="color: #666;">Mã này có hiệu lực trong <b>2 phút</b>. Vì lý do bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              Đây là email tự động, vui lòng không trả lời email này.<br>
              &copy; 2024 OmniGym Solution.
            </p>
          </div>
        `,
      });
      console.log(`[Email] OTP sent to ${identifier}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // Still log to console for debugging if email fails
      console.log(`[OTP Backup] Sent to ${identifier}: ${otp}`);
    }
  } else {
    // For phone or other, just log for now
    console.log(`[OTP] Sent to ${identifier}: ${otp}`);
  }

  return { message: 'OTP đã được gửi. Vui lòng kiểm tra email của bạn.' };
};

export const verifyOTP = async (identifier: string, otp: string) => {
  const otpData = otpStore[identifier];

  if (!otpData) return false;

  // Check if expired
  if (Date.now() > otpData.expiresAt) {
    delete otpStore[identifier];
    return false;
  }

  if (otpData.otp === otp) {
    delete otpStore[identifier];
    return true;
  }

  return false;
};

export const registerUser = async (userData: any) => {
  const userRepository = AppDataSource.getRepository(User);

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Encrypt sensitive info if needed with AES
  // Example: phone_number = encryptAES(userData.phone_number);

  const newUser = userRepository.create({
    ...userData,
    password: hashedPassword,
    role_id: 3, // Default role: Customer
    status: 'active',
  });

  await userRepository.save(newUser);
  return newUser;
};

export const loginUser = async (identifier: string, password: string) => {
  const userRepository = AppDataSource.getRepository(User);
  
  const user = await userRepository.findOne({
    where: identifier.includes('@') ? { email: identifier } : { phone_number: identifier },
    relations: { role: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  return user;
};
