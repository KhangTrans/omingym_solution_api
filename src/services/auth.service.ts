import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { RegisterUserDto } from '../dtos/auth.dto.js';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client();

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
  // Check if user already exists
  const userRepository = AppDataSource.getRepository(User);
  const existingUser = await userRepository.findOne({
    where: identifier.includes('@') ? { email: identifier } : { phone_number: identifier }
  });

  if (existingUser) {
    throw new Error(identifier.includes('@') ? 'Email đã được đăng ký.' : 'Số điện thoại đã được đăng ký.');
  }

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

export const registerUser = async (userData: RegisterUserDto) => {
  const userRepository = AppDataSource.getRepository(User);

  // Check existing user again to be safe
  const existingUser = await userRepository.findOne({
    where: [
      userData.email ? { email: userData.email } : null,
      userData.phone_number ? { phone_number: userData.phone_number } : null
    ].filter((condition): condition is { email: string } | { phone_number: string } => condition !== null)
  });

  if (existingUser) {
    if (userData.email && existingUser.email === userData.email) {
      throw new Error('Email đã được sử dụng.');
    }
    if (userData.phone_number && existingUser.phone_number === userData.phone_number) {
      throw new Error('Số điện thoại đã được sử dụng.');
    }
  }

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

// Reset Password Logic
const resetStore: Record<string, { otp: string, expiresAt: number }> = {};

export const initiateForgotPassword = async (email: string) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });

  if (!user) {
    throw new Error('Email không tồn tại trên hệ thống.');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  resetStore[email] = { otp, expiresAt };

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Yêu cầu khôi phục mật khẩu - OmniGym',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #f44336; text-align: center;">Khôi phục mật khẩu</h2>
        <p>Chào bạn,</p>
        <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; color: #333; background: #eee; padding: 10px 20px; border-radius: 5px;">${otp}</span>
        </div>
        <p>Mã này có hiệu lực trong <b>15 phút</b>.</p>
        <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ.</p>
        <hr style="border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999;">OmniGym Solution</p>
      </div>
    `,
  });

  return { message: 'Mã khôi phục đã được gửi vào email của bạn.' };
};

export const resetPassword = async (email: string, otp: string, newPass: string) => {
  const data = resetStore[email];

  if (!data || data.otp !== otp || Date.now() > data.expiresAt) {
    throw new Error('Mã OTP không chính xác hoặc đã hết hạn.');
  }

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });

  if (!user) throw new Error('Người dùng không tồn tại.');

  user.password = await bcrypt.hash(newPass, 10);
  await userRepository.save(user);

  delete resetStore[email];
  return { message: 'Mật khẩu đã được thay đổi thành công.' };
};

export const changePassword = async (userId: number, oldPass: string, newPass: string) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) throw new Error('Người dùng không tồn tại.');

  const isOldMatch = await bcrypt.compare(oldPass, user.password);
  if (!isOldMatch) {
    throw new Error('Mật khẩu cũ không chính xác.');
  }

  user.password = await bcrypt.hash(newPass, 10);
  await userRepository.save(user);

  return { message: 'Thay đổi mật khẩu thành công.' };
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

export const verifyGoogleToken = async (idToken: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: [
      process.env.GOOGLE_CLIENT_ID_WEB!,
      process.env.GOOGLE_CLIENT_ID_MOBILE!
    ],
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google token');
  }
  return payload;
};

export const loginWithGoogle = async (googlePayload: any) => {
  const userRepository = AppDataSource.getRepository(User);
  const { email, name, picture, sub: googleId } = googlePayload;

  let user = await userRepository.findOne({
    where: { email },
    relations: { role: true }
  });

  if (!user) {
    // Auto-register if user doesn't exist
    user = userRepository.create({
      email,
      full_name: name,
      avatar_url: picture,
      password: await bcrypt.hash(googleId, 10), // Dummy password for social login
      role_id: 3, // Default role: Customer
      status: 'active'
    });
    await userRepository.save(user);
    
    // Re-fetch to get role info
    user = await userRepository.findOne({
      where: { id: user.id },
      relations: { role: true }
    }) as User;
  }

  return user;
};
