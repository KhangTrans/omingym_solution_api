import { AppDataSource } from '../config/data-source.js';
import { Branch } from '../models/branch.entity.js';
import { BranchImage } from '../models/branch-image.entity.js';
import { BranchFacility } from '../models/branch-facility.entity.js';
import { CreateBranchDto } from '../dtos/branch.dto.js';

export const createBranch = async (data: CreateBranchDto) => {
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    // 1. Create Branch
    const branchRepo = transactionalEntityManager.getRepository(Branch);
    const newBranch = branchRepo.create({
      partner_id: data.partner_id,
      branch_name: data.branch_name,
      address: data.address,
      hotline: data.hotline,
      status: 'active',
      province: data.province,
      district: data.district,
      opening_house: data.opening_house,
      image_url: data.image_url
    });
    
    const savedBranch = await transactionalEntityManager.save(newBranch);

    // 2. Save Branch Images if any
    if (data.images && data.images.length > 0) {
      const imageRepo = transactionalEntityManager.getRepository(BranchImage);
      const branchImages = data.images.map(img => imageRepo.create({
        branch_id: savedBranch.id,
        image_url: img.image_url,
        is_cover: img.is_cover || false,
        sort_order: img.sort_order || 0
      }));
      await transactionalEntityManager.save(branchImages);
    }

    // 3. Save Branch Facilities if any
    if (data.facilities && data.facilities.length > 0) {
      const facilityRepo = transactionalEntityManager.getRepository(BranchFacility);
      const branchFacilities = data.facilities.map(facility => facilityRepo.create({
        branch_id: savedBranch.id,
        facility_name: facility.facility_name,
        description: facility.description,
        icon_url: facility.icon_url
      }));
      await transactionalEntityManager.save(branchFacilities);
    }

    // Return the branch with its relations
    return await transactionalEntityManager.findOne(Branch, {
      where: { id: savedBranch.id }
      // You can add relations here if needed for the response
    });
  });
};

export const getAllBranches = async (partnerId?: number) => {
  const branchRepo = AppDataSource.getRepository(Branch);
  return await branchRepo.find({
    where: partnerId ? { partner_id: partnerId } : {},
    order: { id: 'DESC' }
  });
};

export const getBranchById = async (branchId: number) => {
  const branchRepo = AppDataSource.getRepository(Branch);
  const branch = await branchRepo.findOne({
    where: { id: branchId }
  });

  if (!branch) {
    throw new Error('Branch not found');
  }

  return branch;
};

export const updateBranch = async (branchId: number, data: Partial<CreateBranchDto>) => {
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    const branchRepo = transactionalEntityManager.getRepository(Branch);
    const branch = await branchRepo.findOne({
      where: { id: branchId }
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Update branch fields
    if (data.branch_name) branch.branch_name = data.branch_name;
    if (data.address) branch.address = data.address;
    if (data.hotline) branch.hotline = data.hotline;
    if (data.province) branch.province = data.province;
    if (data.district) branch.district = data.district;
    if (data.opening_house) branch.opening_house = data.opening_house;
    if (data.image_url) branch.image_url = data.image_url;

    const updatedBranch = await transactionalEntityManager.save(branch);

    // Update images if provided
    if (data.images && data.images.length > 0) {
      const imageRepo = transactionalEntityManager.getRepository(BranchImage);
      // Delete old images
      await imageRepo.delete({ branch_id: branchId });

      const branchImages = data.images.map(img => imageRepo.create({
        branch_id: branchId,
        image_url: img.image_url,
        is_cover: img.is_cover || false,
        sort_order: img.sort_order || 0
      }));
      await transactionalEntityManager.save(branchImages);
    }

    // Update facilities if provided
    if (data.facilities && data.facilities.length > 0) {
      const facilityRepo = transactionalEntityManager.getRepository(BranchFacility);
      // Delete old facilities
      await facilityRepo.delete({ branch_id: branchId });

      const branchFacilities = data.facilities.map(facility => facilityRepo.create({
        branch_id: branchId,
        facility_name: facility.facility_name,
        description: facility.description,
        icon_url: facility.icon_url
      }));
      await transactionalEntityManager.save(branchFacilities);
    }

    return updatedBranch;
  });
};
