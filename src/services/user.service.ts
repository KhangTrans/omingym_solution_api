import { AppDataSource } from '../config/data-source.js';
import { User } from '../models/user.entity.js';

export const fetchUsers = async () => {
  const userRepository = AppDataSource.getRepository(User);
  return await userRepository.find();
};

export const updateUserProfile = async (userId: number, updateData: any) => {
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

  return await userRepository.save(user);
};

export const createNewUser = (userData: { name: string }) => {
  // Logic to save user to database would go here
  return { id: Date.now(), ...userData };
};
