import { Request, Response } from 'express';
import {
  checkInCustomer,
  fetchMyCheckInLogs,
  fetchCustomerCheckInLogsForAdmin,
  fetchCustomerCheckInLogsForBranch,
} from '../services/customer-check-in.service.js';
import { CustomerCheckInDto, GetCustomerCheckInQueryDto } from '../dtos/customer-check-in.dto.js';

export const customerCheckInHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { branch_id, dynamic_qr_token }: CustomerCheckInDto = req.body;

    if (!branch_id) {
      return res.status(400).json({ message: 'Vui lòng cung cấp branch_id để check-in.' });
    }

    const checkInRecord = await checkInCustomer(userId, Number(branch_id), dynamic_qr_token);
    res.status(200).json({
      message: 'Check-in thành công!',
      checkIn: checkInRecord,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyCheckInLogsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const logs = await fetchMyCheckInLogs(userId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerCheckInLogsForAdminHandler = async (req: Request, res: Response) => {
  try {
    const query: GetCustomerCheckInQueryDto = {};

    if (req.query.customer_id) {
      query.customer_id = Number(req.query.customer_id);
    }
    if (req.query.branch_id) {
      query.branch_id = Number(req.query.branch_id);
    }
    if (req.query.date) {
      query.date = String(req.query.date);
    }

    const logs = await fetchCustomerCheckInLogsForAdmin(query);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerCheckInLogsForBranchHandler = async (req: Request, res: Response) => {
  try {
    const query: GetCustomerCheckInQueryDto = {};

    if (req.query.customer_id) {
      query.customer_id = Number(req.query.customer_id);
    }
    if (req.query.branch_id) {
      query.branch_id = Number(req.query.branch_id);
    }
    if (req.query.date) {
      query.date = String(req.query.date);
    }

    const currentUser = req.session.user!;
    const logs = await fetchCustomerCheckInLogsForBranch(query, currentUser);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
