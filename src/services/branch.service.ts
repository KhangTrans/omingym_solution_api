import { AppDataSource } from '../config/data-source.js';
import { Branch } from '../models/branch.entity.js';
import { BranchImage } from '../models/branch-image.entity.js';
import { BranchFacility } from '../models/branch-facility.entity.js';
import { BranchFacilityImage } from '../models/branch-facility-image.entity.js';
import { Trainer } from '../models/trainer.entity.js';
import { CreateBranchDto } from '../dtos/branch.dto.js';

export const createBranch = async (data: CreateBranchDto) => {
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    // 1. Create Branch
    const branchRepo = transactionalEntityManager.getRepository(Branch);
    const newBranch = branchRepo.create({
      manager_id: data.manager_id,
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
      const facilityImageRepo = transactionalEntityManager.getRepository(BranchFacilityImage);
      
      for (const facData of data.facilities) {
        const newFacility = facilityRepo.create({
          branch_id: savedBranch.id,
          facility_name: facData.facility_name,
          description: facData.description,
          icon_url: facData.icon_url
        });
        const savedFacility = await transactionalEntityManager.save(newFacility);

        if (facData.images && facData.images.length > 0) {
          const facImages = facData.images.map(img => facilityImageRepo.create({
            facility_id: savedFacility.id,
            image_url: img.image_url,
            is_cover: img.is_cover || false,
            sort_order: img.sort_order || 0
          }));
          await transactionalEntityManager.save(facImages);
        }
      }
    }

    // Return the branch with its relations
    return await transactionalEntityManager.findOne(Branch, {
      where: { id: savedBranch.id }
      // You can add relations here if needed for the response
    });
  });
};

export const getAllBranches = async (
  managerId?: number,
  province?: string,
  district?: string,
  status?: string,
  search?: string,
  page?: number,
  limit?: number
) => {
  const branchRepo = AppDataSource.getRepository(Branch);
  const queryBuilder = branchRepo.createQueryBuilder('branch');

  // Mặc định: chỉ hiển thị active branches trừ khi yêu cầu lấy 'all' hoặc một status cụ thể
  if (status !== 'all') {
    const activeStatus = status || 'active';
    queryBuilder.andWhere('branch.status = :status', { status: activeStatus });
  }

  if (managerId) {
    queryBuilder.andWhere('branch.manager_id = :managerId', { managerId });
  }

  if (province) {
    queryBuilder.andWhere('branch.province = :province', { province });
  }

  if (district) {
    queryBuilder.andWhere('branch.district = :district', { district });
  }

  if (search) {
    queryBuilder.andWhere(
      '(LOWER(branch.branch_name) LIKE LOWER(:search) OR LOWER(branch.address) LIKE LOWER(:search))',
      { search: `%${search}%` }
    );
  }

  queryBuilder.orderBy('branch.id', 'DESC');

  if (page !== undefined || limit !== undefined) {
    const p = page || 1;
    const l = limit || 10;
    const skip = (p - 1) * l;

    queryBuilder.skip(skip).take(l);
    const [branches, total] = await queryBuilder.getManyAndCount();

    return {
      branches,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    };
  }

  return await queryBuilder.getMany();
};

export const getBranchById = async (branchId: number) => {
  const branchRepo = AppDataSource.getRepository(Branch);
  const branch = await branchRepo.findOne({
    where: { id: branchId }
  });

  if (!branch) {
    throw new Error('Branch not found');
  }

  const imageRepo = AppDataSource.getRepository(BranchImage);
  const facilityRepo = AppDataSource.getRepository(BranchFacility);

  const [images, facilities] = await Promise.all([
    imageRepo.find({ where: { branch_id: branchId }, order: { sort_order: 'ASC' } }),
    facilityRepo.find({ where: { branch_id: branchId } })
  ]);

  const facilityImageRepo = AppDataSource.getRepository(BranchFacilityImage);
  const facilitiesWithImages = await Promise.all(
    facilities.map(async (fac) => {
      const facImages = await facilityImageRepo.find({
        where: { facility_id: fac.id },
        order: { sort_order: 'ASC' }
      });
      return {
        ...fac,
        images: facImages
      };
    })
  );

  return {
    ...branch,
    images,
    facilities: facilitiesWithImages
  };
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
    if (data.manager_id !== undefined) branch.manager_id = data.manager_id;

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
      const facilityImageRepo = transactionalEntityManager.getRepository(BranchFacilityImage);

      // Delete old facility images and facilities
      const oldFacilities = await facilityRepo.find({ where: { branch_id: branchId } });
      for (const oldFac of oldFacilities) {
        await facilityImageRepo.delete({ facility_id: oldFac.id });
      }
      await facilityRepo.delete({ branch_id: branchId });

      for (const facData of data.facilities) {
        const newFacility = facilityRepo.create({
          branch_id: branchId,
          facility_name: facData.facility_name,
          description: facData.description,
          icon_url: facData.icon_url
        });
        const savedFacility = await transactionalEntityManager.save(newFacility);

        if (facData.images && facData.images.length > 0) {
          const facImages = facData.images.map(img => facilityImageRepo.create({
            facility_id: savedFacility.id,
            image_url: img.image_url,
            is_cover: img.is_cover || false,
            sort_order: img.sort_order || 0
          }));
          await transactionalEntityManager.save(facImages);
        }
      }
    }

    return updatedBranch;
  });
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
};

export const getBranchByIdOrSlug = async (
  branchId?: number,
  slug?: string,
  trainerPage: number = 1,
  trainerLimit: number = 5
) => {
  const branchRepo = AppDataSource.getRepository(Branch);
  let branch;

  if (branchId !== undefined) {
    branch = await branchRepo.findOne({ where: { id: branchId } });
  } else if (slug !== undefined) {
    const allBranches = await branchRepo.find();
    branch = allBranches.find(b => b.branch_name && slugify(b.branch_name) === slug);
  }

  if (!branch) {
    throw new Error('Branch not found');
  }

  const imageRepo = AppDataSource.getRepository(BranchImage);
  const facilityRepo = AppDataSource.getRepository(BranchFacility);

  const [images, facilities] = await Promise.all([
    imageRepo.find({ where: { branch_id: branch.id }, order: { sort_order: 'ASC' } }),
    facilityRepo.find({ where: { branch_id: branch.id } })
  ]);

  const facilityImageRepo = AppDataSource.getRepository(BranchFacilityImage);
  const facilitiesWithImages = await Promise.all(
    facilities.map(async (fac) => {
      const facImages = await facilityImageRepo.find({
        where: { facility_id: fac.id },
        order: { sort_order: 'ASC' }
      });
      return {
        ...fac,
        images: facImages
      };
    })
  );

  // Lấy danh sách trainer kèm phân trang
  const trainerRepo = AppDataSource.getRepository(Trainer);
  const skip = (trainerPage - 1) * trainerLimit;

  const [trainers, trainerCount] = await trainerRepo.findAndCount({
    where: { branch_id: branch.id, is_active: true },
    relations: { user: true },
    skip,
    take: trainerLimit,
    order: { id: 'DESC' }
  });

  // Loại bỏ password của user trước khi trả về
  const cleanedTrainers = trainers.map(t => {
    if (t.user) {
      delete t.user.password;
    }
    return t;
  });

  return {
    ...branch,
    images,
    facilities: facilitiesWithImages,
    trainers: cleanedTrainers,
    trainerMeta: {
      total: trainerCount,
      page: trainerPage,
      limit: trainerLimit,
      totalPages: Math.ceil(trainerCount / trainerLimit)
    }
  };
};
