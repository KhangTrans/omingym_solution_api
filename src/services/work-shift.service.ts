import { AppDataSource } from '../config/data-source.js';
import { WorkShift } from '../models/work-shift.entity.js';
import { CreateWorkShiftDto, GetWorkShiftsQueryDto, UpdateWorkShiftDto } from '../dtos/work-shift.dto.js';

const generateCheckInCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createShift = async (payload: CreateWorkShiftDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);

  const code = payload.check_in_code?.trim().toUpperCase() || generateCheckInCode();

  const shift = shiftRepository.create({
    user_id: payload.user_id,
    branch_id: payload.branch_id,
    date: new Date(payload.date),
    start_time: payload.start_time.trim(),
    end_time: payload.end_time.trim(),
    status: 'scheduled',
    check_in_code: code,
  });

  return shiftRepository.save(shift);
};

export const fetchShifts = async (query: GetWorkShiftsQueryDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const qb = shiftRepository
    .createQueryBuilder('shift')
    .leftJoinAndSelect('shift.user', 'user')
    .leftJoinAndSelect('shift.branch', 'branch')
    .orderBy('shift.date', 'DESC')
    .addOrderBy('shift.start_time', 'ASC');

  if (query.user_id) {
    qb.andWhere('shift.user_id = :userId', { userId: query.user_id });
  }

  if (query.branch_id) {
    qb.andWhere('shift.branch_id = :branchId', { branchId: query.branch_id });
  }

  if (query.date) {
    qb.andWhere('shift.date = :date', { date: query.date });
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
    },
  });
};

export const updateShift = async (id: number, payload: UpdateWorkShiftDto) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const shift = await shiftRepository.findOne({ where: { id } });

  if (!shift) {
    return null;
  }

  if (payload.date) {
    shift.date = new Date(payload.date);
  }
  if (payload.start_time) {
    shift.start_time = payload.start_time.trim();
  }
  if (payload.end_time) {
    shift.end_time = payload.end_time.trim();
  }
  if (payload.status) {
    shift.status = payload.status.trim();
  }
  if (payload.check_in_code) {
    shift.check_in_code = payload.check_in_code.trim().toUpperCase();
  }

  return shiftRepository.save(shift);
};

export const deleteShift = async (id: number) => {
  const shiftRepository = AppDataSource.getRepository(WorkShift);
  const shift = await shiftRepository.findOne({ where: { id } });

  if (!shift) {
    return false;
  }

  await shiftRepository.remove(shift);
  return true;
};
