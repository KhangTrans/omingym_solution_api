import { Request, Response } from 'express';
import { fetchUsers, fetchUsersPaginated, createNewUser, updateUserProfile, fetchUserProfile, updateUserStatus } from '../services/user.service.js';
import { UpdateProfileDto, CreateUserDto } from '../dtos/user.dto.js';
import { uploadImage } from '../utils/cloudinary.js';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await fetchUsersPaginated({ page, limit, role, status, search });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await fetchUserProfile(userId);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
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

    // Sync session data with updated user info
    // if (req.session.user) {
    //   req.session.user.full_name = updatedUser.full_name;
    //   req.session.user.avatar_url = updatedUser.avatar_url;
    //   req.session.user.phone_number = updatedUser.phone_number;
    // }

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

export const updateUserStatusHandler = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const { status } = req.body as { status?: string };
    const normalizedStatus = String(status || '').toLowerCase();
    if (!['active', 'locked'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatedUser = await updateUserStatus(userId, normalizedStatus);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...rest } = updatedUser;
    return res.json({ message: 'Status updated successfully', user: rest });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
