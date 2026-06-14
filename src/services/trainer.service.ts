import { AppDataSource } from "../config/data-source.js";
import { Trainer } from "../models/trainer.entity.js";
import { Branch } from "../models/branch.entity.js";
import { Staff } from "../models/staff.entity.js";

export const getApprovedTrainers = async (currentUser: any) => {
  const trainerRepo = AppDataSource.getRepository(Trainer);
  const role = String(currentUser.role).toLowerCase();

  // Create query builder
  const qb = trainerRepo.createQueryBuilder("trainer")
    .leftJoinAndSelect("trainer.user", "user")
    .leftJoinAndSelect("trainer.branch", "branch")
    .where("trainer.is_active = :isActive", { isActive: true });

  if (role === "admin") {
    // Admin sees all active trainers
  } else if (role === "branchmanager") {
    // BranchManager sees active trainers in their managed branches
    const branchRepository = AppDataSource.getRepository(Branch);
    const managedBranches = await branchRepository.find({
      where: { manager_id: currentUser.id }
    });
    const managedBranchIds = managedBranches.map(b => b.id);

    if (managedBranchIds.length === 0) {
      return [];
    }

    qb.andWhere("trainer.branch_id IN (:...branchIds)", { branchIds: managedBranchIds });
  } else if (role === "staff") {
    // Staff sees active trainers in their assigned branch
    const staffRepository = AppDataSource.getRepository(Staff);
    const staff = await staffRepository.findOne({
      where: { user_id: currentUser.id }
    });

    if (!staff || !staff.branch_id) {
      throw new Error("Tài khoản nhân viên chưa được gán chi nhánh.");
    }

    qb.andWhere("trainer.branch_id = :branchId", { branchId: staff.branch_id });
  } else {
    throw new Error("Bạn không có quyền truy cập chức năng này.");
  }

  const trainers = await qb.getMany();

  // Remove passwords for security
  return trainers.map(t => {
    if (t.user) {
      delete t.user.password;
    }
    return t;
  });
};
