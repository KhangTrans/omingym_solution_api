import { Request, Response } from "express";
import {
  addFavoriteTrainer,
  removeFavoriteTrainer,
  isTrainerFavorited,
  getMyFavoriteTrainers,
} from "../services/favorite-trainer.service.js";

const parseTrainerId = (raw: unknown): number | null => {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
};

/**
 * POST /api/favorites/trainers/:trainerId
 * Yêu cầu đăng nhập. Thêm trainer vào danh sách yêu thích của user hiện tại.
 */
export const addFavoriteTrainerHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res
        .status(400)
        .json({ message: "ID huấn luyện viên không hợp lệ." });
    }

    const result = await addFavoriteTrainer(userId, trainerId);

    return res.status(201).json({
      message: "Đã thêm vào danh sách yêu thích.",
      data: {
        favorite_id: result.id,
        trainer_id: trainerId,
        is_favorited: true,
      },
    });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return res
      .status(status)
      .json({ message: error?.message || "Không thể lưu trainer này." });
  }
};

/**
 * DELETE /api/favorites/trainers/:trainerId
 * Yêu cầu đăng nhập. Bỏ favorite trainer.
 */
export const removeFavoriteTrainerHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res
        .status(400)
        .json({ message: "ID huấn luyện viên không hợp lệ." });
    }

    await removeFavoriteTrainer(userId, trainerId);

    return res.json({
      message: "Đã bỏ khỏi danh sách yêu thích.",
      data: {
        trainer_id: trainerId,
        is_favorited: false,
      },
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Không thể bỏ trainer khỏi yêu thích." });
  }
};

/**
 * GET /api/favorites/trainers/:trainerId/status
 * Yêu cầu đăng nhập. Trả về true nếu user đang favorite trainer này.
 */
export const getFavoriteTrainerStatusHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res
        .status(400)
        .json({ message: "ID huấn luyện viên không hợp lệ." });
    }

    const favorited = await isTrainerFavorited(userId, trainerId);

    return res.json({
      message: "Lấy trạng thái yêu thích thành công.",
      data: {
        trainer_id: trainerId,
        is_favorited: favorited,
      },
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Không thể lấy trạng thái yêu thích." });
  }
};

/**
 * GET /api/favorites/trainers
 * Yêu cầu đăng nhập. Trả về danh sách trainer đang active mà user đã favorite.
 */
export const getMyFavoriteTrainersHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const data = await getMyFavoriteTrainers(userId);

    return res.json({
      message: "Lấy danh sách trainer yêu thích thành công.",
      data,
    });
  } catch (error: any) {
    console.error(
      "[favorite-trainer.controller] getMyFavoriteTrainers error:",
      error,
    );
    return res
      .status(500)
      .json({ message: error?.message || "Lỗi khi tải danh sách yêu thích." });
  }
};
