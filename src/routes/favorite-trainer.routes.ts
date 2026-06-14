import { Router } from "express";
import {
  addFavoriteTrainerHandler,
  removeFavoriteTrainerHandler,
  getFavoriteTrainerStatusHandler,
  getMyFavoriteTrainersHandler,
} from "../controllers/favorite-trainer.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

// Tất cả endpoint của favorite trainer đều yêu cầu user đăng nhập.
// userId được lấy từ token (req.user) — không nhận từ payload phía client.

router.get("/trainers", isAuthenticated, getMyFavoriteTrainersHandler);

router.get(
  "/trainers/:trainerId/status",
  isAuthenticated,
  getFavoriteTrainerStatusHandler,
);

router.post(
  "/trainers/:trainerId",
  isAuthenticated,
  addFavoriteTrainerHandler,
);

router.delete(
  "/trainers/:trainerId",
  isAuthenticated,
  removeFavoriteTrainerHandler,
);

export default router;
