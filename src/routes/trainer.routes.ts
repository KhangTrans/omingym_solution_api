import { Router } from "express";
import { getApprovedTrainersHandler } from "../controllers/trainer.controller.js";
import { isAuthenticated, authorizeRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/approved",
  isAuthenticated,
  authorizeRole(["Admin", "BranchManager", "Staff"]),
  getApprovedTrainersHandler
);

export default router;
