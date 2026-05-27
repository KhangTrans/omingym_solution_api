import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';
import { UpdateProfileDto, CreateUserDto } from '../dtos/user.dto.js';
import { getCache, setCache, deleteCache } from '../utils/cache.js';

export const fetchUsers = async () => {
  const cacheKey = 'users:all';
  const cachedUsers = await getCache<User[]>(cacheKey);
  
  if (cachedUsers) {
    return cachedUsers;
  }

  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find();
  
  await setCache(cacheKey, users, 300); // Cache for 5 minutes
  return users;
};

export const updateUserProfile = async (userId: number, updateData: UpdateProfileDto) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOneBy({ id: userId });

  if (!user) {
    throw new Error('User not found');
  }

  // Update fields
  if (updateData.full_name) user.full_name = updateData.full_name;
  if (updateData.avatar_url) user.avatar_url = updateData.avatar_url;
  if (updateData.dob) user.dob = new Date(updateData.dob);
  if (updateData.height) user.height = updateData.height;
  if (updateData.weight) user.weight = updateData.weight;
  if (updateData.workout_goal) user.workout_goal = updateData.workout_goal;
  if (updateData.medical_history) user.medical_history = updateData.medical_history;

  const updatedUser = await userRepository.save(user);
  
  // Invalidate cache
  await deleteCache('users:all');
  
  return updatedUser;
};

export const createNewUser = (userData: CreateUserDto) => {
  // Logic to save user to database would go here
  return { id: Date.now(), ...userData };
};
