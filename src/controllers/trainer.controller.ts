import { Request, Response } from "express";
import { getApprovedTrainers } from "../services/trainer.service.js";

export const getApprovedTrainersHandler = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: "Chưa xác thực người dùng." });
    }
    const trainers = await getApprovedTrainers(currentUser);
    res.json({
      status: "success",
      data: trainers,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
