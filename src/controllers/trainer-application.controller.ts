import { Request, Response } from "express";
import {
  submitTrainerApplication,
  getTrainerApplications,
  getTrainerApplicationById,
  getMyTrainerApplication,
  approveTrainerApplication,
  rejectTrainerApplication,
  saveTrainerApplicationDraft,
} from "../services/trainer-application.service.js";

import { TrainerLevel } from "../models/trainer-status.enum.js";

const validateCreateTrainerApplicationBody = (body: any): string | null => {
  const {
    branch_id,
    desired_level,
    specialization,
    avatar_url,
    phone_number,
    address,
    identity_number,
    identity_image_url,
    certificates,
  } = body;

  if (!branch_id || Number(branch_id) <= 0) {
    return "Vui lòng chọn chi nhánh muốn ứng tuyển.";
  }

  if (!desired_level || !Object.values(TrainerLevel).includes(desired_level)) {
    return "Vui lòng chọn level muốn ứng tuyển hợp lệ.";
  }

  if (!specialization || !avatar_url || !phone_number || !address) {
    return "Vui lòng nhập đầy đủ thông tin hồ sơ Trainer.";
  }

  if (!identity_number || !identity_image_url) {
    return "Vui lòng nhập đầy đủ thông tin định danh.";
  }

  if (!Array.isArray(certificates) || certificates.length === 0) {
    return "Vui lòng thêm ít nhất một chứng chỉ.";
  }

  for (const cert of certificates) {
    if (
      !cert.cert_name ||
      !cert.issued_by ||
      !cert.certificate_number ||
      !cert.image_url ||
      !cert.expires_at
    ) {
      return "Thông tin chứng chỉ chưa đầy đủ.";
    }
  }

  return null;
};

export const createTrainerApplicationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user!.id;

    const validationError = validateCreateTrainerApplicationBody(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const application = await submitTrainerApplication(userId, req.body);

    return res.status(201).json({
      message: "Nộp đơn đăng ký Trainer thành công.",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getTrainerApplicationsHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const applications = await getTrainerApplications();

    return res.json({
      data: applications,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTrainerApplicationByIdHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Application id không hợp lệ." });
    }

    const application = await getTrainerApplicationById(id);

    return res.json({
      data: application,
    });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const getMyTrainerApplicationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user!.id;

    const application = await getMyTrainerApplication(userId);

    return res.json({
      data: application,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveTrainerApplicationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const adminId = req.user!.id;
    const { approved_level } = req.body;

    if (
      !approved_level ||
      !Object.values(TrainerLevel).includes(approved_level)
    ) {
      return res.status(400).json({
        message: "Vui lòng chọn level duyệt hợp lệ cho Trainer.",
      });
    }

    if (!id) {
      return res.status(400).json({ message: "Application id không hợp lệ." });
    }

    const result = await approveTrainerApplication(id, adminId, approved_level);

    return res.json({
      message: "Duyệt đơn Trainer thành công.",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const rejectTrainerApplicationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const adminId = req.user!.id;
    const { rejection_reason } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Application id không hợp lệ." });
    }

    if (!rejection_reason) {
      return res.status(400).json({ message: "Vui lòng nhập lý do từ chối." });
    }

    const application = await rejectTrainerApplication(
      id,
      adminId,
      rejection_reason,
    );

    return res.json({
      message: "Từ chối đơn Trainer thành công.",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const saveTrainerApplicationDraftHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user!.id;

    const application = await saveTrainerApplicationDraft(userId, req.body);

    return res.json({
      message: "Lưu nháp hồ sơ Trainer thành công.",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
