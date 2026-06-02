import { Request, Response } from 'express';
import * as postService from '../services/post.service.js';
import { CreatePostDto } from '../dtos/post.dto.js';

export const createPost = async (req: Request, res: Response) => {
  try {
    const user = req.session.user;
    if (!user?.id || !user?.role) {
      return res.status(401).json({ message: 'Unauthorized: No author session found' });
    }

    const postData: CreatePostDto = req.body;
    const post = await postService.createPost(user.id, postData, user.role);

    res.status(201).json({
      message: 'Post created as draft successfully',
      post
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const userRole = req.session.user?.role;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await postService.getAllPosts(userRole, page, limit, search);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approvePost = async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string);
    const post = await postService.approvePost(postId);
    res.json({ message: 'Post published successfully', post });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectPost = async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string);
    const post = await postService.rejectPost(postId);
    res.json({ message: 'Post rejected successfully', post });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitPostForApproval = async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string);
    const user = req.session.user;

    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const post = await postService.submitPostForApproval(postId, user.id, user.role);
    res.json({ message: 'Post sent for approval successfully', post });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const userRole = req.session.user?.role;
    const post = await postService.getPostById(id, userRole);
    res.json(post);
  } catch (error: any) {
    const status = error.message.includes('không tìm thấy') ? 404 : 403;
    res.status(status).json({ message: error.message });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const user = req.session.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const post = await postService.updatePost(id, user.id, user.role, req.body);
    res.json({ 
      message: user.role === 'Staff' ? 'Post updated and pending re-approval' : 'Post updated successfully', 
      post 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const user = req.session.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    await postService.deletePost(id, user.id, user.role);
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
