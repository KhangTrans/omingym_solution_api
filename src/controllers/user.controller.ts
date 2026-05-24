import { Request, Response } from 'express';
import { fetchUsers, createNewUser, updateUserProfile } from '../services/user.service.js';

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

    const updatedUser = await updateUserProfile(userId, req.body);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }
  const newUser = createNewUser({ name });
  res.status(201).json(newUser);
};
