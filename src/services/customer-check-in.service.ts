import { AppDataSource } from '../config/data-source.js';
import { Between } from 'typeorm';
import { Customer } from '../models/customer.entity.js';
import { CustomerSubscription } from '../models/customer-subscription.entity.js';
import { CustomerCheckIn } from '../models/customer-check-in.entity.js';
import { Branch } from '../models/branch.entity.js';
import { Staff } from '../models/staff.entity.js';
import { GetCustomerCheckInQueryDto } from '../dtos/customer-check-in.dto.js';

export const checkInCustomer = async (
  userId: number,
  branchId: number,
  dynamicQrToken?: string
) => {
  const customerRepository = AppDataSource.getRepository(Customer);
  const subscriptionRepository = AppDataSource.getRepository(CustomerSubscription);
  const checkInRepository = AppDataSource.getRepository(CustomerCheckIn);

  // 1. Xác thực hồ sơ Khách hàng liên kết với User
  const customer = await customerRepository.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new Error('Tài khoản của bạn không phải là tài khoản khách hàng để thực hiện check-in.');
  }

  // 2. Xác thực mã QR nếu có truyền lên (chỉ kiểm tra khớp branch_id, bỏ qua kiểm tra chu kỳ thời gian 30s)
  if (dynamicQrToken) {
    const parts = dynamicQrToken.split(':');
    if (parts.length > 0) {
      const qrBranchId = Number(parts[0]);
      if (Number.isInteger(qrBranchId) && qrBranchId !== branchId) {
        throw new Error('Mã QR quét được không khớp với chi nhánh bạn đang check-in.');
      }
    }
  }

  // 3. Lấy tất cả gói tập đang hoạt động (active) của khách hàng
  const activeSubscriptions = await subscriptionRepository.find({
    where: {
      customer_id: customer.id,
      status: 'active',
    },
    relations: {
      membership: {
        branches: true,
      },
    },
  });

  if (activeSubscriptions.length === 0) {
    throw new Error('Bạn chưa mua gói tập hoặc gói tập hiện đang không hoạt động. Vui lòng đăng ký gói thành viên để check-in.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let isDateValid = false;
  let isBranchAllowed = false;

  for (const sub of activeSubscriptions) {
    const start = sub.start_date ? new Date(sub.start_date) : null;
    const end = sub.end_date ? new Date(sub.end_date) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const withinRange = (!start || today >= start) && (!end || today <= end);
    if (withinRange) {
      isDateValid = true;
      // Kiểm tra xem gói tập có hỗ trợ chi nhánh hiện tại không
      const matchesBranch = sub.membership?.branches?.some(
        (b) => b.branch_id === branchId
      );
      if (matchesBranch) {
        isBranchAllowed = true;
        break; // Tìm thấy gói tập hợp lệ thỏa mãn
      }
    }
  }

  if (!isDateValid) {
    throw new Error('Gói tập của bạn đã hết hạn hoặc chưa đến ngày bắt đầu có hiệu lực.');
  }

  if (!isBranchAllowed) {
    throw new Error('Gói tập của bạn không được đăng ký áp dụng tại chi nhánh này.');
  }

  // 4. Kiểm tra giới hạn 1 ngày chỉ check-in được 1 lần
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existingCheckIn = await checkInRepository.findOne({
    where: {
      customer_id: customer.id,
      check_in_time: Between(todayStart, todayEnd),
    },
  });

  if (existingCheckIn) {
    throw new Error('Bạn đã check-in ngày hôm nay rồi. Mỗi ngày chỉ được check-in 1 lần.');
  }

  // 5. Lưu bản ghi check-in mới
  const checkIn = checkInRepository.create({
    customer_id: customer.id,
    branch_id: branchId,
    check_in_time: new Date(),
  });

  return await checkInRepository.save(checkIn);
};

export const fetchMyCheckInLogs = async (userId: number) => {
  const customerRepository = AppDataSource.getRepository(Customer);
  const checkInRepository = AppDataSource.getRepository(CustomerCheckIn);

  const customer = await customerRepository.findOne({ where: { user_id: userId } });
  if (!customer) {
    throw new Error('Không tìm thấy thông tin khách hàng tương ứng.');
  }

  return await checkInRepository.find({
    where: { customer_id: customer.id },
    relations: {
      branch: true,
    },
    order: {
      check_in_time: 'DESC',
    },
  });
};

export const fetchCustomerCheckInLogsForAdmin = async (query: GetCustomerCheckInQueryDto) => {
  const checkInRepository = AppDataSource.getRepository(CustomerCheckIn);
  const qb = checkInRepository
    .createQueryBuilder('checkIn')
    .leftJoinAndSelect('checkIn.customer', 'customer')
    .leftJoinAndSelect('customer.user', 'user')
    .leftJoinAndSelect('checkIn.branch', 'branch')
    .orderBy('checkIn.check_in_time', 'DESC');

  if (query.branch_id) {
    qb.andWhere('checkIn.branch_id = :branchId', { branchId: query.branch_id });
  }

  if (query.customer_id) {
    qb.andWhere('checkIn.customer_id = :customerId', { customerId: query.customer_id });
  }

  if (query.date) {
    qb.andWhere('DATE(checkIn.check_in_time) = :date', { date: query.date });
  }

  return await qb.getMany();
};

export const fetchCustomerCheckInLogsForBranch = async (
  query: GetCustomerCheckInQueryDto,
  currentUser: { id: number; role: string }
) => {
  const checkInRepository = AppDataSource.getRepository(CustomerCheckIn);
  const qb = checkInRepository
    .createQueryBuilder('checkIn')
    .leftJoinAndSelect('checkIn.customer', 'customer')
    .leftJoinAndSelect('customer.user', 'user')
    .leftJoinAndSelect('checkIn.branch', 'branch')
    .orderBy('checkIn.check_in_time', 'DESC');

  const role = String(currentUser.role).toLowerCase();

  if (role === 'branchmanager') {
    const branchRepository = AppDataSource.getRepository(Branch);
    const managedBranches = await branchRepository.find({
      where: { manager_id: currentUser.id }
    });
    const managedBranchIds = managedBranches.map(b => b.id);

    if (managedBranchIds.length === 0) {
      return [];
    }

    if (query.branch_id) {
      if (!managedBranchIds.includes(Number(query.branch_id))) {
        throw new Error('Bạn không có quyền xem dữ liệu của chi nhánh này.');
      }
      qb.andWhere('checkIn.branch_id = :branchId', { branchId: query.branch_id });
    } else {
      qb.andWhere('checkIn.branch_id IN (:...branchIds)', { branchIds: managedBranchIds });
    }
  } else if (role === 'staff') {
    const staffRepository = AppDataSource.getRepository(Staff);
    const staff = await staffRepository.findOne({
      where: { user_id: currentUser.id }
    });

    if (!staff || !staff.branch_id) {
      throw new Error('Tài khoản nhân viên chưa được gán chi nhánh.');
    }

    if (query.branch_id && Number(query.branch_id) !== staff.branch_id) {
      throw new Error('Bạn không có quyền xem dữ liệu của chi nhánh khác.');
    }

    qb.andWhere('checkIn.branch_id = :branchId', { branchId: staff.branch_id });
  } else {
    throw new Error('Bạn không có quyền truy cập thông tin chi nhánh này.');
  }

  if (query.customer_id) {
    qb.andWhere('checkIn.customer_id = :customerId', { customerId: query.customer_id });
  }

  if (query.date) {
    qb.andWhere('DATE(checkIn.check_in_time) = :date', { date: query.date });
  }

  return await qb.getMany();
};
