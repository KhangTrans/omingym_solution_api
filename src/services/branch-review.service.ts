import { AppDataSource } from '../config/data-source.js';
import { Customer } from '../models/customer.entity.js';
import { CustomerSubscription } from '../models/customer-subscription.entity.js';
import { CustomerCheckIn } from '../models/customer-check-in.entity.js';
import { BranchReview } from '../models/branch-review.entity.js';
import { Branch } from '../models/branch.entity.js';

export const checkCanReview = async (userId: number, branchId: number) => {
  const customerRepo = AppDataSource.getRepository(Customer);
  const subscriptionRepo = AppDataSource.getRepository(CustomerSubscription);
  const checkInRepo = AppDataSource.getRepository(CustomerCheckIn);
  const branchRepo = AppDataSource.getRepository(Branch);

  // 1. Check if branch exists
  const branch = await branchRepo.findOne({ where: { id: branchId } });
  if (!branch) {
    return { canReview: false, reason: 'Chi nhánh không tồn tại.' };
  }

  // 2. Find customer record corresponding to user ID
  const customer = await customerRepo.findOne({ where: { user_id: userId } });
  if (!customer) {
    return { canReview: false, reason: 'Chức năng đánh giá chỉ dành cho tài khoản Khách hàng.' };
  }

  // 3. Verify customer has an active subscription package
  const activeSub = await subscriptionRepo.findOne({
    where: {
      customer_id: customer.id,
      status: 'active'
    }
  });
  if (!activeSub) {
    return { canReview: false, reason: 'Bạn cần có một gói tập đang hoạt động để đánh giá.' };
  }

  // 4. Verify customer has checked in at this branch at least once
  const checkIn = await checkInRepo.findOne({
    where: {
      customer_id: customer.id,
      branch_id: branchId
    }
  });
  if (!checkIn) {
    return { canReview: false, reason: 'Bạn cần phải check-in tại chi nhánh này ít nhất 1 lần để thực hiện đánh giá.' };
  }

  return { canReview: true, customerId: customer.id };
};

export const createOrUpdateReview = async (
  userId: number,
  branchId: number,
  rating: number,
  comment?: string
) => {
  if (rating < 1 || rating > 5) {
    throw new Error('Đánh giá phải từ 1 đến 5 sao.');
  }

  const verification = await checkCanReview(userId, branchId);
  if (!verification.canReview || !verification.customerId) {
    throw new Error(verification.reason || 'Bạn không đủ điều kiện đánh giá chi nhánh này.');
  }

  const customerId = verification.customerId;
  const reviewRepo = AppDataSource.getRepository(BranchReview);

  // Check for existing review by the customer for this branch
  let review = await reviewRepo.findOne({
    where: { customer_id: customerId, branch_id: branchId }
  });

  if (review) {
    review.rating = rating;
    review.comment = comment;
  } else {
    review = reviewRepo.create({
      customer_id: customerId,
      branch_id: branchId,
      rating,
      comment
    });
  }

  return await reviewRepo.save(review);
};

export const getReviewsByBranch = async (branchId: number) => {
  const reviewRepo = AppDataSource.getRepository(BranchReview);
  return await reviewRepo.find({
    where: { branch_id: branchId },
    relations: {
      customer: {
        user: true
      }
    },
    order: {
      created_at: 'DESC'
    }
  });
};

export const getBranchRatingStats = async (branchId: number) => {
  const reviewRepo = AppDataSource.getRepository(BranchReview);
  
  const stats = await reviewRepo
    .createQueryBuilder('review')
    .select('AVG(review.rating)', 'avgRating')
    .addSelect('COUNT(review.id)', 'reviewCount')
    .where('review.branch_id = :branchId', { branchId })
    .getRawOne();

  return {
    averageRating: stats.avgRating ? parseFloat(parseFloat(stats.avgRating).toFixed(1)) : 0,
    reviewCount: parseInt(stats.reviewCount || '0')
  };
};
