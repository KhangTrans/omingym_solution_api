import { AppDataSource } from '../config/data-source.js';
import { MembershipPackage } from '../models/membership-package.entity.js';
import { MembershipBranch } from '../models/membership-branch.entity.js';
import { Branch } from '../models/branch.entity.js';
import { CreateMembershipPackageDto, UpdateMembershipPackageDto } from '../dtos/membership-package.dto.js';
import { getCache, setCache, deleteCache } from '../utils/cache.js';

export const fetchAllPackages = async () => {
  const cacheKey = 'membership_packages:all';
  const cachedPackages = await getCache<MembershipPackage[]>(cacheKey);

  if (cachedPackages) {
    return cachedPackages;
  }

  const packageRepository = AppDataSource.getRepository(MembershipPackage);
  const packages = await packageRepository.find({
    relations: { branches: true },
    order: { created_at: 'DESC' }
  });

  await setCache(cacheKey, packages, 600);
  return packages;
};

export const fetchPackageById = async (id: number) => {
  const packageRepository = AppDataSource.getRepository(MembershipPackage);
  const pkg = await packageRepository.findOne({
    where: { id },
    relations: { branches: true }
  });

  if (!pkg) {
    throw new Error('Membership package not found');
  }

  return pkg;
};

export const createPackage = async (data: CreateMembershipPackageDto) => {
  const packageRepository = AppDataSource.getRepository(MembershipPackage);
  const branchRepository = AppDataSource.getRepository(Branch);
  const membershipBranchRepository = AppDataSource.getRepository(MembershipBranch);

  const newPackage = packageRepository.create({
    name: data.name,
    price: data.price,
    duration_months: data.duration_months,
    description: data.description,
    benefits: data.benefits,
    status: data.status || 'active'
  });

  const savedPackage = await packageRepository.save(newPackage);

  // Handle branches
  let branchIds = data.branch_ids;

  // Nếu không chọn branch hoặc rỗng → apply tất cả chi nhánh
  if (!branchIds || branchIds.length === 0) {
    const allBranches = await branchRepository.find();
    branchIds = allBranches.map(b => b.id);
  }

  // Insert membership_branches records
  if (branchIds && branchIds.length > 0) {
    const membershipBranches = branchIds.map(branchId =>
      membershipBranchRepository.create({
        membership_id: savedPackage.id,
        branch_id: branchId
      })
    );
    await membershipBranchRepository.save(membershipBranches);
  }

  await deleteCache('membership_packages:all');

  return savedPackage;
};

export const updatePackage = async (id: number, data: UpdateMembershipPackageDto) => {
  const packageRepository = AppDataSource.getRepository(MembershipPackage);
  const branchRepository = AppDataSource.getRepository(Branch);
  const membershipBranchRepository = AppDataSource.getRepository(MembershipBranch);

  const pkg = await packageRepository.findOne({ where: { id } });
  if (!pkg) {
    throw new Error('Membership package not found');
  }

  if (data.name !== undefined) pkg.name = data.name;
  if (data.price !== undefined) pkg.price = data.price;
  if (data.duration_months !== undefined) pkg.duration_months = data.duration_months;
  if (data.description !== undefined) pkg.description = data.description;
  if (data.benefits !== undefined) pkg.benefits = data.benefits;
  if (data.status !== undefined) pkg.status = data.status;

  const updatedPackage = await packageRepository.save(pkg);

  // Handle branches update
  if (data.branch_ids !== undefined) {
    // Xóa branches cũ
    await membershipBranchRepository.delete({ membership_id: id });

    let branchIds = data.branch_ids;

    // Nếu rỗng → apply tất cả chi nhánh
    if (!branchIds || branchIds.length === 0) {
      const allBranches = await branchRepository.find();
      branchIds = allBranches.map(b => b.id);
    }

    // Insert membership_branches records mới
    if (branchIds && branchIds.length > 0) {
      const membershipBranches = branchIds.map(branchId =>
        membershipBranchRepository.create({
          membership_id: id,
          branch_id: branchId
        })
      );
      await membershipBranchRepository.save(membershipBranches);
    }
  }

  await deleteCache('membership_packages:all');

  return updatedPackage;
};
