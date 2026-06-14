import crypto from 'crypto';
import { AppDataSource } from '../config/data-source.js';
import { WorkShift } from '../models/work-shift.entity.js';
import { Shift } from '../models/shift.entity.js';
import {
  CreateWorkShiftDto,
  GetWorkShiftsQueryDto,
  UpdateWorkShiftDto,
} from '../dtos/work-shift.dto.js';
import { WorkShiftStatus } from '../models/work-shift-status.enum.js';

const generateCheckInCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
};

const isValidStatus = (value: string): value is WorkShiftStatus =>
  Object.values(WorkShiftStatus).includes(value as WorkShiftStatus);

export const createShift = async (payload: CreateWorkShiftDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const templateRepo = AppDataSource.getRepository(Shift);

  if (payload.shift_id) {
    const template = await templateRepo.findOne({ where: { id: payload.shift_id } });
    if (!template) {
      throw new Error('Ca trực không tồn tại.');
    }
  }

  const code = payload.check_in_code?.trim().toUpperCase() || generateCheckInCode();

  const workShift = shiftRepository.create({
    user_id: payload.user_id,
    branch_id: payload.branch_id,
    date: new Date(payload.date),
    shift_id: payload.shift_id ?? null,
    status: WorkShiftStatus.Scheduled,
    check_in_code: code,
  });

  return shiftRepository.save(workShift);
};

export const fetchShifts = async (query: GetWorkShiftsQueryDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const qb = shiftRepository
    .createQueryBuilder('shift')
    .leftJoinAndSelect('shift.user', 'user')
    .leftJoinAndSelect('shift.branch', 'branch')
    .leftJoinAndSelect('shift.shift', 'template')
    .orderBy('shift.date', 'DESC')
    .addOrderBy('template.start_time', 'ASC');

  if (query.user_id) {
    qb.andWhere('shift.user_id = :userId', { userId: query.user_id });
  }
  if (query.branch_id) {
    qb.andWhere('shift.branch_id = :branchId', { branchId: query.branch_id });
  }
  if (query.date) {
    qb.andWhere('shift.date = :date', { date: query.date });
  }
  if (query.status) {
    qb.andWhere('shift.status = :status', { status: query.status });
  }

  return qb.getMany();
};

export const fetchShiftById = async (id: number) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  return shiftRepository.findOne({
    where: { id },
    relations: {
      user: true,
      branch: true,
      shift: true,
    },
  });
};

export const updateShift = async (id: number, payload: UpdateWorkShiftDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const templateRepo = AppDataSource.getRepository(Shift);

  const workShift = await shiftRepository.findOne({ where: { id } });
  if (!workShift) {
    return null;
  }

  if (payload.date) {
    workShift.date = new Date(payload.date);
  }

  if (payload.shift_id !== undefined) {
    if (payload.shift_id === null) {
      workShift.shift_id = null;
    } else {
      const template = await templateRepo.findOne({ where: { id: payload.shift_id } });
      if (!template) {
        throw new Error('Ca trực không tồn tại.');
      }
      workShift.shift_id = template.id;
    }
  }

  if (payload.status) {
    const trimmed = payload.status.trim();
    if (!isValidStatus(trimmed)) {
      throw new Error('Trạng thái ca làm việc không hợp lệ.');
    }
    workShift.status = trimmed as WorkShiftStatus;
  }

  if (payload.check_in_code) {
    workShift.check_in_code = payload.check_in_code.trim().toUpperCase();
  }

  return shiftRepository.save(workShift);
};

export const deleteShift = async (id: number) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const workShift = await shiftRepository.findOne({ where: { id } });

  if (!workShift) {
    return false;
  }

  await shiftRepository.remove(workShift);
  return true;
};
