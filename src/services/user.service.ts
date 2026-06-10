import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import { Customer } from '../models/customer.entity.js';
import { Trainer } from '../models/trainer.entity.js';
import { Staff } from '../models/staff.entity.js';
import { UpdateProfileDto, CreateUserDto } from '../dtos/user.dto.js';
import { getCache, setCache, deleteCache } from '../utils/cache.js';

export const fetchUsers = async () => {
  const cacheKey = 'users:all';
  const cachedUsers = await getCache<User[]>(cacheKey);
  
  if (cachedUsers) {
    return cachedUsers;
  }

  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find({
    relations: { role: true, customer: true, trainer: true, staff: true }
  });
  
  await setCache(cacheKey, users, 300); // Cache for 5 minutes
  return users;
};

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface UserListResponseData {
  data: Omit<User, 'password'>[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const clearUserCache = async () => {
  await deleteCache('users:all');
  try {
    const redis = (await import('../config/redis.js')).default;
    const isRedisEnabled = (await import('../config/redis.js')).isRedisEnabled;
    if (isRedisEnabled) {
      const keys = await redis.keys('users:paginated:*');
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (err) {
    console.error('Failed to clear paginated user cache:', err);
  }
};

export const fetchUsersPaginated = async (params: UserListParams): Promise<UserListResponseData> => {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 15;
  const skip = (page - 1) * limit;

  const cacheKey = `users:paginated:${page}:${limit}:${params.role || 'all'}:${params.status || 'all'}:${params.search || ''}`;
  const cachedData = await getCache<UserListResponseData>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const userRepository = AppDataSource.getRepository(User);
  const queryBuilder = userRepository.createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('user.customer', 'customer')
    .leftJoinAndSelect('user.trainer', 'trainer')
    .leftJoinAndSelect('user.staff', 'staff');

  // Filter roles: Only show Customer, Trainer, Staff. Exclude Admin, BranchManager.
  if (params.role && ['Customer', 'Trainer', 'Staff'].includes(params.role)) {
    queryBuilder.andWhere('role.role_name = :role', { role: params.role });
  } else {
    queryBuilder.andWhere('role.role_name IN (:...allowedRoles)', { allowedRoles: ['Customer', 'Trainer', 'Staff'] });
  }

  // Filter status
  if (params.status) {
    queryBuilder.andWhere('user.status = :status', { status: params.status });
  }

  // Search filter
  if (params.search && params.search.trim()) {
    const searchPattern = `%${params.search.trim()}%`;
    queryBuilder.andWhere(
      '(user.full_name LIKE :search OR user.email LIKE :search OR user.phone_number LIKE :search)',
      { search: searchPattern }
    );
  }

  // Pagination & Order
  queryBuilder
    .orderBy('user.created_at', 'DESC')
    .skip(skip)
    .take(limit);

  const [users, total] = await queryBuilder.getManyAndCount();

  // Sanitize passwords
  const sanitizedUsers = users.map(({ password, ...rest }) => rest) as Omit<User, 'password'>[];

  const result = {
    data: sanitizedUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };

  await setCache(cacheKey, result, 60); // Cache paginated results for 60 seconds
  return result;
};

export const fetchUserProfile = async (userId: number) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: { 
      role: true, 
      customer: true, 
      trainer: { branch: true }, 
      staff: { branch: true } 
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

export const updateUserProfile = async (userId: number, updateData: UpdateProfileDto) => {
  const userRepository = AppDataSource.getRepository(User);
  
  const user = await userRepository.findOne({ 
    where: { id: userId },
    relations: { 
      role: true, 
      customer: true, 
      trainer: { branch: true }, 
      staff: { branch: true } 
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Update base User fields
  if (updateData.full_name) user.full_name = updateData.full_name;
  if (updateData.phone_number) user.phone_number = updateData.phone_number;
  if (updateData.avatar_url) user.avatar_url = updateData.avatar_url;

  // Handle Role-specific information
  const roleName = user.role?.role_name?.toLowerCase();

  switch (roleName) {
    case 'customer':
      const customerRepo = AppDataSource.getRepository(Customer);
      let customer = user.customer || customerRepo.create({ user_id: userId });
      if (updateData.dob) customer.dob = new Date(updateData.dob);
      if (updateData.height) customer.height = Number(updateData.height);
      if (updateData.weight) customer.weight = Number(updateData.weight);
      if (updateData.gender) customer.gender = updateData.gender;
      if (updateData.medical_history !== undefined) customer.medical_history = updateData.medical_history;
      if (updateData.workout_goal !== undefined) customer.workout_goal = updateData.workout_goal;
      await customerRepo.save(customer);
      break;

    case 'trainer':
      const trainerRepo = AppDataSource.getRepository(Trainer);
      let trainer = user.trainer || trainerRepo.create();
      trainer.user_id = userId;
      if (updateData.specialization) trainer.specialization = updateData.specialization;
      if (updateData.bio) trainer.bio = updateData.bio;
      if (updateData.experience_years) trainer.years_experience = Number(updateData.experience_years);
      if (updateData.branch_id !== undefined) trainer.branch_id = updateData.branch_id ? Number(updateData.branch_id) : undefined;
      await trainerRepo.save(trainer);
      break;

    case 'staff':
      const staffRepo = AppDataSource.getRepository(Staff);
      let staff = user.staff || staffRepo.create();
      staff.user_id = userId;
      if (updateData.department) staff.department = updateData.department;
      if (updateData.branch_id !== undefined) staff.branch_id = updateData.branch_id ? Number(updateData.branch_id) : undefined;
      await staffRepo.save(staff);
      break;
  }

  await userRepository.save(user);
  
  // Re-fetch to get all relations and updated status
  const updatedUser = await userRepository.findOne({
    where: { id: userId },
    relations: { 
      role: true, 
      customer: true, 
      trainer: { branch: true }, 
      staff: { branch: true } 
    }
  });
  
  // Invalidate cache
  await clearUserCache();
  
  return updatedUser;
};

export const updateUserStatus = async (userId: number, status: string) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: { 
      role: true, 
      customer: true, 
      trainer: { branch: true }, 
      staff: { branch: true } 
    }
  });

  if (!user) {
    return null;
  }

  user.status = status;
  await userRepository.save(user);

  await clearUserCache();

  return user;
};

export const createNewUser = (userData: CreateUserDto) => {
  // Logic to save user to database would go here
  return { id: Date.now(), ...userData };
};

export const saveUserFaceEmbedding = async (userId: number, faceVector: number[]) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new Error('Không tìm thấy người dùng');
  }

  if (!Array.isArray(faceVector) || faceVector.length === 0 || faceVector.some(n => typeof n !== 'number')) {
    throw new Error('Vector khuôn mặt không hợp lệ');
  }

  user.face_embedding = JSON.stringify(faceVector);
  await userRepository.save(user);

  await clearUserCache();
  return { id: user.id, email: user.email, full_name: user.full_name };
};
