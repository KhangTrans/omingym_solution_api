import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import { Customer } from '../models/customer.entity.js';
import { Partner } from '../models/partner.entity.js';
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
    relations: { role: true, customer: true, partner: true, trainer: true, staff: true }
  });
  
  await setCache(cacheKey, users, 300); // Cache for 5 minutes
  return users;
};

export const fetchUserProfile = async (userId: number) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: { role: true, customer: true, partner: true, trainer: true, staff: true }
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
    relations: { role: true, customer: true, partner: true, trainer: true, staff: true }
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

    case 'partner':
      const partnerRepo = AppDataSource.getRepository(Partner);
      let partner = user.partner || partnerRepo.create({ user_id: userId });
      if (updateData.company_name) partner.company_name = updateData.company_name;
      if (updateData.tax_code) partner.tax_code = updateData.tax_code;
      if (updateData.business_license) partner.business_license = updateData.business_license;
      await partnerRepo.save(partner);
      break;

    case 'trainer':
      const trainerRepo = AppDataSource.getRepository(Trainer);
      let trainer = user.trainer || trainerRepo.create({ user_id: userId });
      if (updateData.specialization) trainer.specialization = updateData.specialization;
      if (updateData.bio) trainer.bio = updateData.bio;
      if (updateData.experience_years) trainer.experience_years = Number(updateData.experience_years);
      await trainerRepo.save(trainer);
      break;

    case 'staff':
      const staffRepo = AppDataSource.getRepository(Staff);
      let staff = user.staff || staffRepo.create({ user_id: userId });
      if (updateData.department) staff.department = updateData.department;
      await staffRepo.save(staff);
      break;
  }

  await userRepository.save(user);
  
  // Re-fetch to get all relations and updated status
  const updatedUser = await userRepository.findOne({
    where: { id: userId },
    relations: { role: true, customer: true, partner: true, trainer: true, staff: true }
  });
  
  // Invalidate cache
  await deleteCache('users:all');
  
  return updatedUser;
};

export const createNewUser = (userData: CreateUserDto) => {
  // Logic to save user to database would go here
  return { id: Date.now(), ...userData };
};
