import { Request, Response } from 'express';
import { createStaffAccount, getStaffList } from '../services/staff.service.js';
import { StaffDto } from '../dtos/staff.dto.js';
import { decryptRSA } from '../utils/crypto.js';

const validateCreateStaffBody = (body: unknown): string | null => {
  const { full_name, email, password } = body as Partial<StaffDto>;

  if (!full_name || !String(full_name).trim()) {
    return 'Vui lòng nhập họ tên nhân viên.';
  }

  if (!email || !String(email).trim()) {
    return 'Vui lòng nhập email.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim())) {
    return 'Định dạng email không hợp lệ.';
  }

  if (!password || String(password).length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.';
  }

  return null;
};

export const createStaffHandler = async (req: Request, res: Response) => {
  try {
    // Giải mã RSA cho mật khẩu được gửi từ client
    let decryptedPassword = req.body.password ? String(req.body.password) : '';
    if (decryptedPassword) {
      try {
        decryptedPassword = decryptRSA(decryptedPassword);
      } catch (error) {
        console.warn('RSA decryption failed for staff password, using password as plain text');
      }
    }

    const validatedBody = {
      ...req.body,
      password: decryptedPassword,
    };

    const validationError = validateCreateStaffBody(validatedBody);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const dto: StaffDto = {
      full_name: String(validatedBody.full_name).trim(),
      email: String(validatedBody.email).trim().toLowerCase(),
      password: validatedBody.password,
      phone_number: validatedBody.phone_number ? String(validatedBody.phone_number).trim() : undefined,
      department: validatedBody.department ? String(validatedBody.department).trim() : undefined,
      branch_id: validatedBody.branch_id ? Number(validatedBody.branch_id) : undefined,
      avatar_url: validatedBody.avatar_url ? String(validatedBody.avatar_url).trim() : undefined,
    };

    const result = await createStaffAccount(dto);

    return res.status(201).json({
      message: 'Tạo tài khoản Staff thành công.',
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return res.status(400).json({ message: err.message });
  }
};

export const getStaffListHandler = async (req: Request, res: Response) => {
  try {
    const staffList = await getStaffList();

    return res.json({
      message: 'Lấy danh sách Staff thành công.',
      data: staffList,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return res.status(500).json({ message: err.message });
  }
};
