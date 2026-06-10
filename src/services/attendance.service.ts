import { AppDataSource } from '../config/data-source.js'; // Note: IsNull is from typeorm, AppDataSource is from config
import { IsNull as TypeormIsNull } from 'typeorm';
import { Attendance } from '../models/attendance.entity.js';
import { WorkShift } from '../models/work-shift.entity.js';
import { User } from '../models/user.entity.js';
import { UpdateAttendanceDto, GetAttendanceQueryDto } from '../dtos/attendance.dto.js';
import crypto from 'crypto';

export const generateDynamicBranchQrToken = (branchId: number): string => {
  const secret = process.env.AES_SECRET || 'omnigym_qr_secret_fallback';
  const timeStep = Math.floor(Date.now() / 30000); // 30 seconds interval
  const hash = crypto.createHmac('sha256', secret)
    .update(`${branchId}:${timeStep}`)
    .digest('hex');
  return `${branchId}:${timeStep}:${hash}`;
};

export const checkIn = async (
  userId: number,
  shiftId: number,
  auth: { checkInCode?: string; dynamicQrToken?: string }
) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const attendanceRepository = AppDataSource.getRepository(Attendance);

  const shift = await shiftRepository.findOne({ where: { id: shiftId } });
  if (!shift) {
    throw new Error('Ca làm việc không tồn tại.');
  }

  if (shift.user_id !== userId) {
    throw new Error('Ca làm việc này không thuộc về bạn.');
  }

  if (shift.status === 'cancelled') {
    throw new Error('Ca làm việc đã bị hủy.');
  }

  // 1. Xác thực bằng Dynamic QR Token hoặc mã PIN cố định
  if (auth.dynamicQrToken) {
    const parts = auth.dynamicQrToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Mã QR không đúng định dạng.');
    }
    const [branchIdStr, timeStepStr, signature] = parts;
    const parsedBranchId = Number(branchIdStr);
    const parsedTimeStep = Number(timeStepStr);
    const serverTimeStep = Math.floor(Date.now() / 30000);

    // Kiểm tra thời gian hết hạn (lệch tối đa 1 chu kỳ 30s)
    if (Math.abs(serverTimeStep - parsedTimeStep) > 1) {
      throw new Error('Mã QR đã hết hạn. Vui lòng quét mã mới.');
    }

    // Kiểm tra xem chi nhánh có khớp với ca làm việc không
    if (parsedBranchId !== shift.branch_id) {
      throw new Error('Mã QR này thuộc chi nhánh khác, không khớp với ca của bạn.');
    }

    // Kiểm tra chữ ký bảo mật
    const secret = process.env.AES_SECRET || 'omnigym_qr_secret_fallback';
    const expectedHash = crypto.createHmac('sha256', secret)
      .update(`${parsedBranchId}:${parsedTimeStep}`)
      .digest('hex');

    if (expectedHash !== signature) {
      throw new Error('Xác thực chữ ký mã QR thất bại.');
    }
  } else if (auth.checkInCode) {
    if (!shift.check_in_code || shift.check_in_code.toUpperCase() !== auth.checkInCode.trim().toUpperCase()) {
      throw new Error('Mã Check-in không chính xác. Vui lòng kiểm tra lại với Quản lý.');
    }
  } else {
    throw new Error('Thiếu thông tin xác thực. Vui lòng nhập mã PIN hoặc quét mã QR.');
  }

  let attendance = await attendanceRepository.findOne({ where: { shift_id: shiftId } });
  if (attendance && attendance.check_in_time) {
    throw new Error('Bạn đã Check-in cho ca làm việc này rồi.');
  }

  const dateString = typeof shift.date === 'string' ? shift.date : (shift.date as Date).toISOString().split('T')[0];
  const scheduledStart = new Date(`${dateString}T${shift.start_time}:00`);

  const now = new Date();
  const gracePeriodMinutes = 15;
  const isLate = now.getTime() > scheduledStart.getTime() + gracePeriodMinutes * 60 * 1000;

  if (!attendance) {
    attendance = attendanceRepository.create({
      shift_id: shiftId,
      user_id: userId,
    });
  }

  attendance.check_in_time = now;
  attendance.status = isLate ? 'late' : 'present';

  return attendanceRepository.save(attendance);
};

export const checkOut = async (userId: number, shiftId?: number) => {
  const attendanceRepository = AppDataSource.getRepository(Attendance);

  let attendance: Attendance | null = null;

  if (shiftId) {
    attendance = await attendanceRepository.findOne({
      where: { shift_id: shiftId, user_id: userId },
    });
  } else {
    attendance = await attendanceRepository.findOne({
      where: { user_id: userId, check_out_time: TypeormIsNull() },
      order: { check_in_time: 'DESC' },
    });
  }

  if (!attendance) {
    throw new Error('Không tìm thấy ca làm việc đã Check-in để thực hiện Check-out.');
  }

  if (attendance.check_out_time) {
    throw new Error('Bạn đã Check-out cho ca làm việc này rồi.');
  }

  attendance.check_out_time = new Date();

  return attendanceRepository.save(attendance);
};

export const fetchAttendanceLogs = async (query: GetAttendanceQueryDto) => {
  const attendanceRepository = AppDataSource.getRepository(Attendance);
  const qb = attendanceRepository
    .createQueryBuilder('attendance')
    .leftJoinAndSelect('attendance.user', 'user')
    .leftJoinAndSelect('attendance.shift', 'shift')
    .leftJoinAndSelect('shift.branch', 'branch')
    .orderBy('attendance.check_in_time', 'DESC');

  if (query.user_id) {
    qb.andWhere('attendance.user_id = :userId', { userId: query.user_id });
  }

  if (query.status) {
    qb.andWhere('attendance.status = :status', { status: query.status });
  }

  if (query.date) {
    qb.andWhere('shift.date = :date', { date: query.date });
  }

  if (query.branch_id) {
    qb.andWhere('shift.branch_id = :branchId', { branchId: query.branch_id });
  }

  return qb.getMany();
};

export const fetchMyAttendanceLogs = async (userId: number) => {
  const attendanceRepository = AppDataSource.getRepository(Attendance);
  return attendanceRepository.find({
    where: { user_id: userId },
    relations: {
      shift: {
        branch: true
      }
    },
    order: { check_in_time: 'DESC' },
  });
};

export const updateAttendanceRecord = async (id: number, payload: UpdateAttendanceDto) => {
  const attendanceRepository = AppDataSource.getRepository(Attendance);
  const attendance = await attendanceRepository.findOne({ where: { id } });

  if (!attendance) {
    return null;
  }

  if (payload.check_in_time !== undefined) {
    attendance.check_in_time = payload.check_in_time ? new Date(payload.check_in_time) : undefined;
  }

  if (payload.check_out_time !== undefined) {
    attendance.check_out_time = payload.check_out_time ? new Date(payload.check_out_time) : undefined;
  }

  if (payload.status !== undefined) {
    attendance.status = payload.status;
  }

  if (payload.notes !== undefined) {
    attendance.notes = payload.notes;
  }

  return attendanceRepository.save(attendance);
};

export const checkInFace = async (
  userId: number,
  shiftId: number,
  faceVector: number[],
  auth: { checkInCode?: string; dynamicQrToken?: string }
) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const attendanceRepository = AppDataSource.getRepository(Attendance);
  const userRepository = AppDataSource.getRepository(User);

  // 1. Kiểm tra ca làm việc
  const shift = await shiftRepository.findOne({ where: { id: shiftId } });
  if (!shift) {
    throw new Error('Ca làm việc không tồn tại.');
  }

  if (shift.user_id !== userId) {
    throw new Error('Ca làm việc này không thuộc về bạn.');
  }

  if (shift.status === 'cancelled') {
    throw new Error('Ca làm việc đã bị hủy.');
  }

  // 2. Xác thực vị trí/sự hiện diện nếu có truyền tham số
  if (auth.dynamicQrToken) {
    const parts = auth.dynamicQrToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Mã QR không đúng định dạng.');
    }
    const [branchIdStr, timeStepStr, signature] = parts;
    const parsedBranchId = Number(branchIdStr);
    const parsedTimeStep = Number(timeStepStr);
    const serverTimeStep = Math.floor(Date.now() / 30000);

    if (Math.abs(serverTimeStep - parsedTimeStep) > 1) {
      throw new Error('Mã QR đã hết hạn. Vui lòng quét mã mới.');
    }

    if (parsedBranchId !== shift.branch_id) {
      throw new Error('Mã QR này thuộc chi nhánh khác, không khớp với ca của bạn.');
    }

    const secret = process.env.AES_SECRET || 'omnigym_qr_secret_fallback';
    const expectedHash = crypto.createHmac('sha256', secret)
      .update(`${parsedBranchId}:${parsedTimeStep}`)
      .digest('hex');

    if (expectedHash !== signature) {
      throw new Error('Xác thực chữ ký mã QR thất bại.');
    }
  } else if (auth.checkInCode) {
    if (!shift.check_in_code || shift.check_in_code.toUpperCase() !== auth.checkInCode.trim().toUpperCase()) {
      throw new Error('Mã Check-in không chính xác. Vui lòng kiểm tra lại với Quản lý.');
    }
  }

  // 3. So khớp khuôn mặt
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new Error('Không tìm thấy thông tin người dùng.');
  }
  if (!user.face_embedding) {
    throw new Error('Bạn chưa đăng ký khuôn mặt trên hệ thống.');
  }

  let savedVector: number[];
  try {
    savedVector = JSON.parse(user.face_embedding);
  } catch (err) {
    throw new Error('Dữ liệu khuôn mặt đã lưu không hợp lệ.');
  }

  if (!Array.isArray(faceVector) || faceVector.length !== savedVector.length) {
    throw new Error(`Mẫu khuôn mặt gửi lên không hợp lệ hoặc kích thước không khớp (Yêu cầu: ${savedVector.length} chiều).`);
  }

  // Tính khoảng cách Euclidean
  let sum = 0;
  for (let i = 0; i < savedVector.length; i++) {
    sum += Math.pow(savedVector[i] - faceVector[i], 2);
  }
  const distance = Math.sqrt(sum);

  const threshold = 0.6; // Ngưỡng nhận diện tiêu chuẩn
  if (distance > threshold) {
    throw new Error(`Nhận diện khuôn mặt thất bại (Độ lệch: ${distance.toFixed(4)}).`);
  }

  // 4. Lưu log điểm danh
  let attendance = await attendanceRepository.findOne({ where: { shift_id: shiftId } });
  if (attendance && attendance.check_in_time) {
    throw new Error('Bạn đã Check-in cho ca làm việc này rồi.');
  }

  const dateString = typeof shift.date === 'string' ? shift.date : (shift.date as Date).toISOString().split('T')[0];
  const scheduledStart = new Date(`${dateString}T${shift.start_time}:00`);

  const now = new Date();
  const gracePeriodMinutes = 15;
  const isLate = now.getTime() > scheduledStart.getTime() + gracePeriodMinutes * 60 * 1000;

  if (!attendance) {
    attendance = attendanceRepository.create({
      shift_id: shiftId,
      user_id: userId,
    });
  }

  attendance.check_in_time = now;
  attendance.status = isLate ? 'late' : 'present';
  attendance.notes = `Face Check-in (Khoảng cách: ${distance.toFixed(4)})`;

  return attendanceRepository.save(attendance);
};
