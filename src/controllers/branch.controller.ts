import { Request, Response } from 'express';
import * as branchService from '../services/branch.service.js';
import { CreateBranchDto } from '../dtos/branch.dto.js';

export const createBranch = async (req: Request, res: Response) => {
  try {
    const branchData: CreateBranchDto = req.body;
    
    // Logic: If user is a Partner, they should only be able to add branch for their own partner_id
    // For now, we take partner_id from body as requested.
    
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
    const { partnerId } = req.query;
    const result = await branchService.getAllBranches(partnerId ? Number(partnerId) : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
