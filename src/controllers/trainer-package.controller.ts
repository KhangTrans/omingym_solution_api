import { Request, Response } from 'express';
import { fetchAllTrainerPackages, fetchTrainerPackageById, createTrainerPackage, updateTrainerPackage } from '../services/trainer-package.service.js';
import { CreateTrainerPackageDto, UpdateTrainerPackageDto } from '../dtos/trainer-package.dto.js';

export const getAllTrainerPackages = async (req: Request, res: Response) => {
  try {
    const packages = await fetchAllTrainerPackages();
    res.json(packages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTrainerPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await fetchTrainerPackageById(Number(id));
    res.json(pkg);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const createNewTrainerPackage = async (req: Request, res: Response) => {
  try {
    const payload: CreateTrainerPackageDto = req.body;
    const newPackage = await createTrainerPackage(payload);
    res.status(201).json({
      message: 'Trainer package created successfully',
      data: newPackage,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTrainerPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload: UpdateTrainerPackageDto = req.body;
    const updatedPackage = await updateTrainerPackage(Number(id), payload);
    res.json({
      message: 'Trainer package updated successfully',
      data: updatedPackage,
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};
