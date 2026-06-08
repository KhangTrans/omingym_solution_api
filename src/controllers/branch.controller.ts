import { Request, Response } from 'express';
import * as branchService from '../services/branch.service.js';
import { CreateBranchDto } from '../dtos/branch.dto.js';

export const createBranch = async (req: Request, res: Response) => {
  try {
    const branchData: CreateBranchDto = req.body;
    
    // Logic: If user is a Branch Manager, they should only be able to add branch for their own manager_id
    // For now, we take manager_id from body as requested.
    
    const result = await branchService.createBranch(branchData);
    res.status(201).json({
      message: 'Branch created successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBranches = async (req: Request, res: Response) => {
  try {
    const { managerId } = req.query;
    const result = await branchService.getAllBranches(managerId ? Number(managerId) : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBranchDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await branchService.getBranchById(Number(id));
    res.json({
      message: 'Branch retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const branchData: Partial<CreateBranchDto> = req.body;
    const user = req.session?.user;

    // Lấy chi nhánh hiện tại để kiểm tra manager_id
    const branch = await branchService.getBranchById(Number(id));

    // Nếu là BranchManager, chỉ được sửa chi nhánh của chính mình quản lý
    if (user?.role === 'BranchManager' && branch.manager_id !== user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa chi nhánh này.' });
    }

    const result = await branchService.updateBranch(Number(id), branchData);
    res.json({
      message: 'Branch updated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(error.message === 'Branch not found' ? 404 : 500).json({ message: error.message });
  }
};
