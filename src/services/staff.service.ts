import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import { Staff } from '../models/staff.entity.js';
import { Branch } from '../models/branch.entity.js';
import { Role } from '../models/role.entity.js';
import { StaffDto } from '../dtos/staff.dto.js';

export const createStaffAccount = async (dto: StaffDto) => {
  return AppDataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const staffRepo = manager.getRepository(Staff);
    const roleRepo = manager.getRepository(Role);

    // Tìm role_id của Staff từ DB
    const staffRole = await roleRepo.findOne({
      where: { role_name: 'Staff' },
    });
    if (!staffRole) {
      throw new Error('Vai trò Staff không tồn tại trong hệ thống.');
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new Error('Email này đã được sử dụng.');
    }

    // Kiểm tra số điện thoại nếu có
    if (dto.phone_number) {
      const existingPhone = await userRepo.findOne({
        where: { phone_number: dto.phone_number },
      });
      if (existingPhone) {
        throw new Error('Số điện thoại này đã được sử dụng.');
      }
    }

    // Kiểm tra branch_id hợp lệ nếu có
    if (dto.branch_id) {
      const branchRepo = manager.getRepository(Branch);
      const branch = await branchRepo.findOne({
        where: { id: dto.branch_id },
      });
      if (!branch) {
        throw new Error('Chi nhánh không tồn tại.');
      }
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Tạo user với role Staff
    const user = userRepo.create({
      full_name: dto.full_name,
      email: dto.email,
      password: hashedPassword,
      phone_number: dto.phone_number || undefined,
      avatar_url: dto.avatar_url || undefined,
      role_id: staffRole.id,
      status: 'active',
    });

    const savedUser = await userRepo.save(user);

    // Tạo bản ghi Staff liên kết với user
    const staff = staffRepo.create({
      user_id: savedUser.id,
      branch_id: dto.branch_id || undefined,
      department: dto.department || undefined,
    });

    const savedStaff = await staffRepo.save(staff);

    return {
      user: {
        id: savedUser.id,
        full_name: savedUser.full_name,
        email: savedUser.email,
        phone_number: savedUser.phone_number,
        avatar_url: savedUser.avatar_url,
        status: savedUser.status,
        role_id: savedUser.role_id,
        created_at: savedUser.created_at,
      },
      staff: {
        id: savedStaff.id,
        user_id: savedStaff.user_id,
        branch_id: savedStaff.branch_id,
        department: savedStaff.department,
      },
    };
  });
};

export const getStaffList = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  // Tìm role_id của Staff từ DB
  const staffRole = await roleRepo.findOne({
    where: { role_name: 'Staff' },
  });
  if (!staffRole) {
    throw new Error('Vai trò Staff không tồn tại trong hệ thống.');
  }

  const staffUsers = await userRepo.createQueryBuilder('user')
    .innerJoinAndSelect('user.staff', 'staff')
    .leftJoinAndSelect('staff.branch', 'branch')
    .leftJoinAndSelect('user.role', 'role')
    .where('user.role_id = :roleId', { roleId: staffRole.id })
    .orderBy('user.created_at', 'DESC')
    .getMany();

  // Loại bỏ password trước khi trả về
  return staffUsers.map(({ password, ...rest }) => rest);
};
