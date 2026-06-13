export enum ApplicationStatus {
  Draft = "draft",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export enum CertificateStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export enum TrainerLevel {
  Junior = "junior", // HLV đã có kinh nghiệm cơ bản, làm quen với việc chạy KPI
  Senior = "senior", // HLV dày dặn kinh nghiệm, có chứng chỉ tốt, khả năng chốt hợp đồng cao
  Master = "master", // HLV cấp cao, chuyên gia chuyên môn hoặc kiêm quản lý/đào tạo nhóm
}
