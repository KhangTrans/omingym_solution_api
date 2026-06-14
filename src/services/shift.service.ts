import { AppDataSource } from '../config/data-source.js';
import { Shift } from '../models/shift.entity.js';

/**
 * Shift template (Ca 1, Ca 2, ...) hiện tại do Quản lý nhập trực tiếp vào DB.
 * Service này chỉ dùng để đọc danh sách ca cho UI và validate tham chiếu.
 */
export const getShiftTemplates = async () => {
  const repo = AppDataSource.getRepository(Shift);
  return repo.find({ order: { start_time: 'ASC' } });
};

export const getShiftTemplateById = async (id: number) => {
  const repo = AppDataSource.getRepository(Shift);
  return repo.findOne({ where: { id } });
};
