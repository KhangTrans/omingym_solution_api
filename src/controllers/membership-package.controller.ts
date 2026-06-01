import { Request, Response } from 'express';
import { fetchAllPackages, fetchPackageById, createPackage, updatePackage } from '../services/membership-package.service.js';
import { CreateMembershipPackageDto, UpdateMembershipPackageDto } from '../dtos/membership-package.dto.js';
import { AppDataSource } from '../config/data-source.js';
import { Branch } from '../models/branch.entity.js';

const formatPackageResponse = async (pkg: any) => {
  const branchRepository = AppDataSource.getRepository(Branch);
  const allBranches = await branchRepository.find();
  const totalBranchCount = allBranches.length;

  const branch_ids = pkg.branches?.map((mb: any) => mb.branch_id) || [];
  const apply_to_all = branch_ids.length === totalBranchCount;

  return {
    ...pkg,
    branch_ids,
    apply_to_all,
    branches: pkg.branches?.map((mb: any) => ({
      id: mb.branch_id,
      name: mb.branch?.name,
      address: mb.branch?.address
    })) || []
  };
};

export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const packages = await fetchAllPackages();
    const formattedPackages = await Promise.all(packages.map(formatPackageResponse));
    res.json(formattedPackages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await fetchPackageById(Number(id));
    const formattedPackage = await formatPackageResponse(pkg);
    res.json(formattedPackage);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const createNewPackage = async (req: Request, res: Response) => {
  try {
    const { name, price, duration_months, description, benefits, status, branch_ids }: CreateMembershipPackageDto = req.body;

    if (!name || price === undefined || price === null || duration_months === undefined || duration_months === null) {
      return res.status(400).json({
        message: 'Name, price, and duration_months are required'
      });
    }

    const newPackage = await createPackage({
      name,
      price,
      duration_months,
      description,
      benefits,
      status,
      branch_ids
    });

    res.status(201).json({
      message: 'Membership package created successfully',
      data: newPackage
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, duration_months, description, benefits, status, branch_ids }: UpdateMembershipPackageDto = req.body;

    const updatedPackage = await updatePackage(Number(id), {
      name,
      price,
      duration_months,
      description,
      benefits,
      status,
      branch_ids
    });

    res.json({
      message: 'Membership package updated successfully',
      data: updatedPackage
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};
