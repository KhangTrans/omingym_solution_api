import { AppDataSource } from "../config/data-source.js";
import { FavoriteTrainer } from "../models/favorite-trainer.entity.js";
import { Trainer } from "../models/trainer.entity.js";

/**
 * Thêm 1 trainer vào danh sách yêu thích của user.
 * - Nếu trainer không tồn tại hoặc đã bị inactive → throw lỗi.
 * - Nếu user đã favorite trainer này rồi → idempotent, trả về record cũ
 *   (tránh lỗi do click 2 lần / race condition).
 */
export const addFavoriteTrainer = async (
  userId: number,
  trainerId: number,
) => {
  const trainerRepo = AppDataSource.getRepository(Trainer);
  const trainer = await trainerRepo.findOne({
    where: { id: trainerId },
  });

  if (!trainer) {
    const error = new Error("Không tìm thấy huấn luyện viên.");
    (error as any).status = 404;
    throw error;
  }

  if (!trainer.is_active) {
    throw new Error("Huấn luyện viên này hiện không còn hoạt động.");
  }

  const favoriteRepo = AppDataSource.getRepository(FavoriteTrainer);

  const existing = await favoriteRepo.findOne({
    where: { user_id: userId, trainer_id: trainerId },
  });

  if (existing) {
    return existing;
  }

  const favorite = favoriteRepo.create({
    user_id: userId,
    trainer_id: trainerId,
  });

  return await favoriteRepo.save(favorite);
};

/**
 * Bỏ favorite. Idempotent — nếu chưa favorite thì cũng không lỗi.
 */
export const removeFavoriteTrainer = async (
  userId: number,
  trainerId: number,
) => {
  const favoriteRepo = AppDataSource.getRepository(FavoriteTrainer);
  await favoriteRepo.delete({
    user_id: userId,
    trainer_id: trainerId,
  });
  return { user_id: userId, trainer_id: trainerId };
};

/**
 * Kiểm tra trainer này đã được user hiện tại lưu vào favorite chưa.
 */
export const isTrainerFavorited = async (
  userId: number,
  trainerId: number,
): Promise<boolean> => {
  const favoriteRepo = AppDataSource.getRepository(FavoriteTrainer);
  const count = await favoriteRepo.count({
    where: { user_id: userId, trainer_id: trainerId },
  });
  return count > 0;
};

/**
 * Lấy danh sách trainer đã favorite của user hiện tại.
 * - Chỉ trả về trainer đang active (is_active = true).
 *   Trainer đã bị xoá/inactive sẽ ẩn khỏi danh sách hiển thị.
 * - Trả về đủ field cần cho UI card: avatar, tên, specialization,
 *   rating, hourly_rate, level, branch.
 */
export const getMyFavoriteTrainers = async (userId: number) => {
  const favoriteRepo = AppDataSource.getRepository(FavoriteTrainer);

  const favorites = await favoriteRepo
    .createQueryBuilder("favorite")
    .leftJoinAndSelect("favorite.trainer", "trainer")
    .leftJoinAndSelect("trainer.user", "user")
    .leftJoinAndSelect("trainer.branch", "branch")
    .where("favorite.user_id = :userId", { userId })
    .andWhere("trainer.is_active = :isActive", { isActive: true })
    .orderBy("favorite.created_at", "DESC")
    .getMany();

  return favorites.map((favorite) => {
    const trainer = favorite.trainer;
    const safeUser = trainer?.user
      ? {
          id: trainer.user.id,
          full_name: trainer.user.full_name,
          avatar_url: trainer.user.avatar_url,
        }
      : null;

    const safeBranch = trainer?.branch
      ? {
          id: trainer.branch.id,
          branch_name: trainer.branch.branch_name,
          province: trainer.branch.province ?? null,
          district: trainer.branch.district ?? null,
        }
      : null;

    return {
      favorite_id: favorite.id,
      favorited_at: favorite.created_at,
      trainer: {
        id: trainer.id,
        user_id: trainer.user_id,
        full_name: safeUser?.full_name ?? null,
        avatar_url: trainer.avatar_url || safeUser?.avatar_url || null,
        specialization: trainer.specialization ?? null,
        level: trainer.level ?? null,
        years_experience: trainer.years_experience ?? 0,
        rating: Number(trainer.rating ?? 0),
        review_count: trainer.review_count ?? 0,
        hourly_rate:
          trainer.hourly_rate === undefined || trainer.hourly_rate === null
            ? null
            : Number(trainer.hourly_rate),
        is_active: trainer.is_active,
        branch: safeBranch,
      },
    };
  });
};
