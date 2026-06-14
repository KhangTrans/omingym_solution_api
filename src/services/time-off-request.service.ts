import { Between, EntityManager, In } from 'typeorm';
import { AppDataSource } from '../config/data-source.js';
import { TimeOffRequest } from '../models/time-off-request.entity.js';
import { TimeOffRequestStatus } from '../models/work-shift-status.enum.js';
import { Branch } from '../models/branch.entity.js';
import { Staff } from '../models/staff.entity.js';
import { Trainer } from '../models/trainer.entity.js';
import {
  CreateTimeOffRequestDto,
  GetTimeOffRequestsQueryDto,
} from '../dtos/time-off-request.dto.js';

/**
 * Lấy branch_id mà user đang trực thuộc, ưu tiên Staff trước Trainer.
 * Trả về null nếu user không gắn với chi nhánh nào (ví dụ: Customer).
 * Chấp nhận EntityManager để dùng đúng connection của transaction đang mở,
 * tránh deprecation warning của pg về việc gọi client.query() đồng thời.
 */
const resolveUserBranchId = async (
  manager: EntityManager,
  userId: number,
): Promise<number | null> => {
  const staff = await manager.getRepository(Staff).findOne({ where: { user_id: userId } });
  if (staff?.branch_id) {
    return staff.branch_id;
  }

  const trainer = await manager.getRepository(Trainer).findOne({ where: { user_id: userId } });
  if (trainer?.branch_id) {
    return trainer.branch_id;
  }

  return null;
};

const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

const toDateOnly = (value: string): Date => {
  // 'YYYY-MM-DD' -> Date(UTC midnight) is fine because we only compare by date.
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error('Định dạng ngày không hợp lệ. Vui lòng nhập YYYY-MM-DD.');
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Ngày không hợp lệ.');
  }
  return date;
};

/**
 * Step 2: Nhân viên xin nghỉ.
 * - Đối chiếu số ngày đã xin nghỉ trong tháng (pending + approved)
 *   với hạn mức monthly_leave_limit của chi nhánh.
 * - Vượt hạn mức báo lỗi ngay.
 */
export const createTimeOffRequest = async (
  userId: number,
  dto: CreateTimeOffRequestDto,
) => {
  const targetDate = toDateOnly(dto.date);

  return AppDataSource.transaction(async (manager) => {
    const requestRepo = manager.getRepository(TimeOffRequest);
    const branchRepo = manager.getRepository(Branch);

    const branchId = await resolveUserBranchId(manager, userId);
    if (!branchId) {
      throw new Error('Tài khoản chưa được gán chi nhánh, không thể xin nghỉ.');
    }

    const branch = await branchRepo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new Error('Không tìm thấy chi nhánh của bạn.');
    }

    // Không cho xin nghỉ ngày đã qua.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate.getTime() < today.getTime()) {
      throw new Error('Không thể xin nghỉ cho ngày đã qua.');
    }

    // Trùng đơn cùng ngày
    const duplicate = await requestRepo.findOne({
      where: {
        user_id: userId,
        date: targetDate,
        status: In([TimeOffRequestStatus.Pending, TimeOffRequestStatus.Approved]),
      },
    });
    if (duplicate) {
      throw new Error('Bạn đã có đơn xin nghỉ cho ngày này.');
    }

    // Đếm số ngày đã xin nghỉ (pending + approved) trong tháng của user.
    const { start, end } = getMonthRange(targetDate);
    const usedCount = await requestRepo.count({
      where: {
        user_id: userId,
        date: Between(start, end),
        status: In([TimeOffRequestStatus.Pending, TimeOffRequestStatus.Approved]),
      },
    });

    if (usedCount + 1 > branch.monthly_leave_limit) {
      throw new Error(
        `Đã vượt hạn mức nghỉ trong tháng (${branch.monthly_leave_limit} ngày) của chi nhánh.`,
      );
    }

    const request = requestRepo.create({
      user_id: userId,
      date: targetDate,
      reason: dto.reason?.trim() || undefined,
      status: TimeOffRequestStatus.Pending,
    });

    return requestRepo.save(request);
  });
};

export const getTimeOffRequests = async (query: GetTimeOffRequestsQueryDto) => {
  const repo = AppDataSource.getRepository(TimeOffRequest);
  const qb = repo
    .createQueryBuilder('req')
    .leftJoinAndSelect('req.user', 'user')
    .orderBy('req.date', 'DESC')
    .addOrderBy('req.created_at', 'DESC');

  if (query.user_id) {
    qb.andWhere('req.user_id = :userId', { userId: query.user_id });
  }
  if (query.status) {
    qb.andWhere('req.status = :status', { status: query.status });
  }
  if (query.month) {
    const [yearStr, monthStr] = query.month.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Tham số month không hợp lệ. Vui lòng nhập YYYY-MM.');
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    qb.andWhere('req.date BETWEEN :start AND :end', { start, end });
  }

  // Lọc theo chi nhánh: join với staff hoặc trainer.
  if (query.branch_id) {
    qb.andWhere(
      `(EXISTS (SELECT 1 FROM staffs s WHERE s.user_id = req.user_id AND s.branch_id = :branchId)
        OR EXISTS (SELECT 1 FROM trainers t WHERE t.user_id = req.user_id AND t.branch_id = :branchId))`,
      { branchId: query.branch_id },
    );
  }

  return qb.getMany();
};

export const getMyTimeOffRequests = async (userId: number) => {
  return getTimeOffRequests({ user_id: userId });
};

export const approveTimeOffRequest = async (id: number, reviewerId: number) => {
  return AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(TimeOffRequest);
    const branchRepo = manager.getRepository(Branch);

    const request = await repo.findOne({ where: { id } });
    if (!request) {
      throw new Error('Không tìm thấy đơn xin nghỉ.');
    }
    if (request.status !== TimeOffRequestStatus.Pending) {
      throw new Error('Chỉ có thể duyệt đơn đang chờ duyệt.');
    }

    // Kiểm tra lại hạn mức tại thời điểm duyệt (phòng tránh race condition).
    const branchId = await resolveUserBranchId(manager, request.user_id);
    if (!branchId) {
      throw new Error('Nhân viên chưa được gán chi nhánh.');
    }
    const branch = await branchRepo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new Error('Không tìm thấy chi nhánh của nhân viên.');
    }

    const targetDate =
      request.date instanceof Date ? request.date : new Date(request.date);
    const { start, end } = getMonthRange(targetDate);

    const approvedCount = await repo.count({
      where: {
        user_id: request.user_id,
        date: Between(start, end),
        status: TimeOffRequestStatus.Approved,
      },
    });

    if (approvedCount + 1 > branch.monthly_leave_limit) {
      throw new Error(
        `Đã vượt hạn mức nghỉ trong tháng (${branch.monthly_leave_limit} ngày) của chi nhánh.`,
      );
    }

    request.status = TimeOffRequestStatus.Approved;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();

    return repo.save(request);
  });
};

export const rejectTimeOffRequest = async (
  id: number,
  reviewerId: number,
  rejectionReason?: string,
) => {
  const repo = AppDataSource.getRepository(TimeOffRequest);
  const request = await repo.findOne({ where: { id } });

  if (!request) {
    throw new Error('Không tìm thấy đơn xin nghỉ.');
  }
  if (request.status !== TimeOffRequestStatus.Pending) {
    throw new Error('Chỉ có thể từ chối đơn đang chờ duyệt.');
  }

  request.status = TimeOffRequestStatus.Rejected;
  request.reviewed_by = reviewerId;
  request.reviewed_at = new Date();
  if (rejectionReason) {
    request.reason = rejectionReason;
  }

  return repo.save(request);
};

export const cancelMyTimeOffRequest = async (userId: number, id: number) => {
  const repo = AppDataSource.getRepository(TimeOffRequest);
  const request = await repo.findOne({ where: { id } });

  if (!request) {
    throw new Error('Không tìm thấy đơn xin nghỉ.');
  }
  if (request.user_id !== userId) {
    throw new Error('Bạn không có quyền hủy đơn này.');
  }
  if (request.status !== TimeOffRequestStatus.Pending) {
    throw new Error('Chỉ có thể hủy đơn đang chờ duyệt.');
  }

  await repo.remove(request);
  return true;
};
