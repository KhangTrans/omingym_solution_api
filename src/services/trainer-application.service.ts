import axios from "axios";
import { AppDataSource } from "../config/data-source.js";
import { TrainerApplication } from "../models/trainer-application.entity.js";
import { TrainerApplicationCertificate } from "../models/trainer-application-certificate.entity.js";
import { Trainer } from "../models/trainer.entity.js";
import { TrainerCertificate } from "../models/trainer-certificate.entity.js";
import { User } from "../models/user.entity.js";
import { CreateTrainerApplicationDto } from "../dtos/create-trainers-application.dto.js";
import {
  ApplicationStatus,
  CertificateStatus,
  TrainerLevel,
} from "../models/trainer-status.enum.js";
import { Branch } from "../models/branch.entity.js";

const sendTrainerApprovedWebhook = async (payload: any) => {
  const webhookUrl = process.env.N8N_TRAINER_APPROVED_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  await axios.post(webhookUrl, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
};

const sendTrainerRejectedWebhook = async (payload: any) => {
  const webhookUrl = process.env.N8N_TRAINER_APPROVED_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  await axios.post(webhookUrl, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
};

export const submitTrainerApplication = async (
  userId: number,
  dto: CreateTrainerApplicationDto,
) => {
  return AppDataSource.transaction(async (manager) => {
    const applicationRepo = manager.getRepository(TrainerApplication);
    const certificateRepo = manager.getRepository(
      TrainerApplicationCertificate,
    );
    const branchRepo = manager.getRepository(Branch);

    const branch = await branchRepo.findOne({
      where: {
        id: dto.branch_id,
        status: "active",
      },
    });

    if (!branch) {
      throw new Error(
        "Chi nhánh ứng tuyển không tồn tại hoặc không hoạt động.",
      );
    }

    // Lấy đơn mới nhất của user. Pending/approved thì không cho gửi lại.
    // Draft/rejected thì cho cập nhật và gửi lại thành pending.
    let application = await applicationRepo.findOne({
      where: { user_id: userId },
      order: { created_at: "DESC" },
    });

    if (application?.status === ApplicationStatus.Pending) {
      throw new Error("Đơn đăng ký Trainer của bạn đang chờ duyệt.");
    }

    if (application?.status === ApplicationStatus.Approved) {
      throw new Error("Tài khoản Trainer của bạn đã được duyệt.");
    }

    if (!application) {
      application = applicationRepo.create({
        user_id: userId,
      });
    }

    application.branch_id = dto.branch_id;
    application.desired_level = dto.desired_level;
    application.bio = dto.bio;
    application.specialization = dto.specialization;
    application.avatar_url = dto.avatar_url;
    application.phone_number = dto.phone_number;
    application.address = dto.address;
    application.years_experience = dto.years_experience ?? 0;
    application.hourly_rate = dto.hourly_rate ?? 0;
    application.identity_number = dto.identity_number;
    application.identity_image_url = dto.identity_image_url;
    application.status = ApplicationStatus.Pending;
    application.submitted_at = new Date();
    application.reviewed_at = undefined;
    application.reviewed_by = undefined;
    application.rejection_reason = undefined;

    const savedApplication = await applicationRepo.save(application);

    // Nếu đơn là rejected/draft và user submit lại, thay bộ certificates mới.
    await certificateRepo.delete({
      application_id: savedApplication.id,
    });

    const certificates = dto.certificates.map((cert) =>
      certificateRepo.create({
        application_id: savedApplication.id,
        cert_name: cert.cert_name,
        issued_by: cert.issued_by,
        certificate_number: cert.certificate_number,
        image_url: cert.image_url,
        issued_at: cert.issued_at ? new Date(cert.issued_at) : undefined,
        expires_at: cert.expires_at ? new Date(cert.expires_at) : undefined,
        status: CertificateStatus.Pending,
      }),
    );

    await certificateRepo.save(certificates);

    return {
      ...savedApplication,
      certificates,
    };
  });
};

//get list trainer
export const getTrainerApplications = async () => {
  const applicationRepo = AppDataSource.getRepository(TrainerApplication);

  return applicationRepo.find({
    relations: {
      user: true,
      branch: true,
      certificates: true,
    },
    order: {
      created_at: "DESC",
    },
  });
};

//get detail
export const getTrainerApplicationById = async (id: number) => {
  const applicationRepo = AppDataSource.getRepository(TrainerApplication);

  const application = await applicationRepo.findOne({
    where: { id },
    relations: {
      user: true,
      branch: true,
      certificates: true,
    },
  });

  if (!application) {
    throw new Error("Không tìm thấy đơn đăng ký Trainer.");
  }

  return application;
};

export const getMyTrainerApplication = async (userId: number) => {
  const applicationRepo = AppDataSource.getRepository(TrainerApplication);

  return applicationRepo.findOne({
    where: { user_id: userId },
    relations: {
      branch: true,
      certificates: true,
    },
    order: {
      created_at: "DESC",
    },
  });
};

//reject trainer
export const rejectTrainerApplication = async (
  applicationId: number,
  adminId: number,
  rejectionReason: string,
) => {
  const applicationRepo = AppDataSource.getRepository(TrainerApplication);

  const application = await applicationRepo.findOne({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error("Không tìm thấy đơn đăng ký Trainer.");
  }

  if (application.status !== ApplicationStatus.Pending) {
    throw new Error("Chỉ có thể từ chối đơn đang chờ duyệt.");
  }

  application.status = ApplicationStatus.Rejected;
  application.reviewed_at = new Date();
  application.reviewed_by = adminId;
  application.rejection_reason = rejectionReason;

  const savedApplication = await applicationRepo.save(application);

  const webhookPayload = {
    event: "trainer_rejected",
    status: savedApplication.status,
    userId: savedApplication.user_id,
    applicationId: savedApplication.id,
    phone: savedApplication.phone_number,
    rejectReason: savedApplication.rejection_reason,
    message: "Xin chào, hồ sơ huấn luyện viên của bạn đã bị từ chối.",
  };

  try {
    await sendTrainerRejectedWebhook(webhookPayload);
  } catch (error) {
    console.error("n8n trainer rejected webhook failed", error);
  }

  return savedApplication;
};

// approve trainer
export const approveTrainerApplication = async (
  applicationId: number,
  adminId: number,
  approvedLevel: TrainerLevel,
) => {
  return AppDataSource.transaction(async (manager) => {
    const applicationRepo = manager.getRepository(TrainerApplication);
    const trainerRepo = manager.getRepository(Trainer);
    const trainerCertificateRepo = manager.getRepository(TrainerCertificate);
    const applicationCertificateRepo = manager.getRepository(
      TrainerApplicationCertificate,
    );
    const userRepo = manager.getRepository(User);

    const application = await applicationRepo.findOne({
      where: { id: applicationId },
      relations: {
        user: true,
        branch: true,
        certificates: true,
      },
    });

    if (!application) {
      throw new Error("Không tìm thấy đơn đăng ký Trainer.");
    }

    if (application.status !== ApplicationStatus.Pending) {
      throw new Error("Chỉ có thể duyệt đơn đang chờ duyệt.");
    }

    let trainer = await trainerRepo.findOne({
      where: { user_id: application.user_id },
    });

    if (!trainer) {
      trainer = trainerRepo.create({
        user_id: application.user_id,
        application_id: application.id,
      });
    }
    if (!application.branch_id) {
      throw new Error("Đơn ứng tuyển chưa có chi nhánh.");
    }

    trainer.application_id = application.id;
    trainer.branch_id = application.branch_id;
    trainer.level = approvedLevel;
    trainer.bio = application.bio;
    trainer.specialization = application.specialization;
    trainer.avatar_url = application.avatar_url;
    trainer.phone_number = application.phone_number;
    trainer.address = application.address;
    trainer.years_experience = application.years_experience ?? 0;
    trainer.hourly_rate = application.hourly_rate;
    trainer.is_active = true;
    trainer.approved_at = new Date();
    trainer.approved_by = adminId;

    const savedTrainer = await trainerRepo.save(trainer);

    const trainerCertificates = application.certificates.map((cert) =>
      trainerCertificateRepo.create({
        trainer_id: savedTrainer.id,
        cert_name: cert.cert_name,
        issued_by: cert.issued_by,
        image_url: cert.image_url,
        certificate_number: cert.certificate_number,
        issued_at: cert.issued_at,
        expires_at: cert.expires_at,
        status: CertificateStatus.Approved,
        verified_at: new Date(),
        verified_by: adminId,
        source_application_certificate_id: cert.id,
      }),
    );

    await trainerCertificateRepo.save(trainerCertificates);

    for (const cert of application.certificates) {
      cert.status = CertificateStatus.Approved;
      cert.verified_at = new Date();
      cert.verified_by = adminId;
    }

    await applicationCertificateRepo.save(application.certificates);

    application.status = ApplicationStatus.Approved;
    application.approved_level = approvedLevel;
    application.reviewed_at = new Date();
    application.reviewed_by = adminId;

    await applicationRepo.save(application);

    await userRepo.update(
      { id: application.user_id },
      {
        role_id: 5,
        status: "active",
      },
    );

    const webhookPayload = {
      event: "trainer_approved",
      status: application.status,
      userId: application.user_id,
      applicationId: application.id,
      phone: application.phone_number,
      // rejectReason: application.rejection_reason,
      message: "Xin chào, hồ sơ huấn luyện viên của bạn đã được duyệt.",
    };

    try {
      await sendTrainerApprovedWebhook(webhookPayload);
    } catch (error) {
      console.error("n8n trainer approved webhook failed", error);
    }

    return {
      trainer: savedTrainer,
      certificates: trainerCertificates,
      webhook_sent: Boolean(process.env.N8N_TRAINER_APPROVED_WEBHOOK_URL),
    };
  });
};

//save draft
export const saveTrainerApplicationDraft = async (
  userId: number,
  dto: Partial<CreateTrainerApplicationDto>,
) => {
  return AppDataSource.transaction(async (manager) => {
    const applicationRepo = manager.getRepository(TrainerApplication);
    const certificateRepo = manager.getRepository(
      TrainerApplicationCertificate,
    );

    let application = await applicationRepo.findOne({
      where: { user_id: userId },
      order: { created_at: "DESC" },
    });

    if (application?.status === ApplicationStatus.Pending) {
      throw new Error(
        "Đơn đăng ký Trainer của bạn đang chờ duyệt, không thể lưu nháp.",
      );
    }

    if (application?.status === ApplicationStatus.Approved) {
      throw new Error("Tài khoản Trainer của bạn đã được duyệt.");
    }

    if (!application) {
      application = applicationRepo.create({
        user_id: userId,
        status: ApplicationStatus.Draft,
      });
    }

    if (dto.branch_id !== undefined) {
      const branchRepo = manager.getRepository(Branch);
      const branch = await branchRepo.findOne({
        where: {
          id: dto.branch_id,
          status: "active",
        },
      });

      if (!branch) {
        throw new Error(
          "Chi nhánh ứng tuyển không tồn tại hoặc không hoạt động.",
        );
      }

      application.branch_id = dto.branch_id;
    }
    if (dto.desired_level !== undefined)
      application.desired_level = dto.desired_level;
    if (dto.bio !== undefined) application.bio = dto.bio;
    if (dto.specialization !== undefined)
      application.specialization = dto.specialization;
    if (dto.avatar_url !== undefined) application.avatar_url = dto.avatar_url;
    if (dto.phone_number !== undefined)
      application.phone_number = dto.phone_number;
    if (dto.address !== undefined) application.address = dto.address;
    if (dto.years_experience !== undefined)
      application.years_experience = dto.years_experience;
    if (dto.hourly_rate !== undefined)
      application.hourly_rate = dto.hourly_rate;
    if (dto.identity_number !== undefined)
      application.identity_number = dto.identity_number;
    if (dto.identity_image_url !== undefined)
      application.identity_image_url = dto.identity_image_url;
    application.status = ApplicationStatus.Draft;

    const savedApplication = await applicationRepo.save(application);

    if (Array.isArray(dto.certificates)) {
      await certificateRepo.delete({
        application_id: savedApplication.id,
      });

      if (dto.certificates.length > 0) {
        const certificates = dto.certificates.map((cert) =>
          certificateRepo.create({
            application_id: savedApplication.id,
            cert_name: cert.cert_name,
            issued_by: cert.issued_by,
            certificate_number: cert.certificate_number,
            image_url: cert.image_url,
            issued_at: cert.issued_at ? new Date(cert.issued_at) : undefined,
            expires_at: cert.expires_at ? new Date(cert.expires_at) : undefined,
            status: CertificateStatus.Pending,
          }),
        );

        await certificateRepo.save(certificates);
      }
    }

    return await applicationRepo.findOne({
      where: { id: savedApplication.id },
      relations: {
        branch: true,
        certificates: true,
      },
    });
  });
};
