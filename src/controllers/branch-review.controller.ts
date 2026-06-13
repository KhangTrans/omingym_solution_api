import { Request, Response } from 'express';
import * as reviewService from '../services/branch-review.service.js';

export const checkCanReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // branchId
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }

    const result = await reviewService.checkCanReview(user.id, Number(id));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrUpdateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // branchId
    const { rating, comment } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }

    const result = await reviewService.createOrUpdateReview(
      user.id,
      Number(id),
      Number(rating),
      comment
    );

    res.status(200).json({
      message: 'Gửi đánh giá thành công.',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getBranchReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // branchId
    const reviews = await reviewService.getReviewsByBranch(Number(id));
    const stats = await reviewService.getBranchRatingStats(Number(id));

    res.json({
      message: 'Lấy danh sách đánh giá thành công.',
      data: {
        stats,
        reviews
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
