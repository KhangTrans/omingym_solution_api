import { Request, Response } from 'express';
import { fetchUsers, createNewUser, updateUserProfile } from '../services/user.service.js';
import { UpdateProfileDto, CreateUserDto } from '../dtos/user.dto.js';
import { uploadImage } from '../utils/cloudinary.js';

export const getUsers = async (req: Request, res: Response) => {
  const users = await fetchUsers();
  res.json(users);
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updateData: UpdateProfileDto = req.body;

    // Example: If base64 image is provided in avatar_url, upload to Cloudinary
    if (updateData.avatar_url && updateData.avatar_url.startsWith('data:image')) {
      const imageUrl = await uploadImage(updateData.avatar_url, 'avatars');
      updateData.avatar_url = imageUrl;
    }

    const updatedUser = await updateUserProfile(userId, updateData);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = (req: Request, res: Response) => {
  const { name }: CreateUserDto = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }
  const newUser = createNewUser({ name });
  res.status(201).json(newUser);
};
