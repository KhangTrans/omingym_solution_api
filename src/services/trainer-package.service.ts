import { AppDataSource } from '../config/data-source.js';
import { TrainerPackage } from '../models/trainer-package.entity.js';
import { CreateTrainerPackageDto, UpdateTrainerPackageDto } from '../dtos/trainer-package.dto.js';

const VALID_TRAINER_LEVELS = ['junior', 'senior', 'master'];
const VALID_MODES = ['1-on-1', 'group'];

const formatPricePerSession = (package_price: number, session_count: number) => {
  return Number((package_price / session_count).toFixed(2));
};

export const fetchAllTrainerPackages = async () => {
  const packageRepository = AppDataSource.getRepository(TrainerPackage);
  return packageRepository.find({ order: { created_at: 'DESC' } });
};

export const fetchTrainerPackageById = async (id: number) => {
  const packageRepository = AppDataSource.getRepository(TrainerPackage);
  const pkg = await packageRepository.findOne({ where: { id } });
  if (!pkg) {
    throw new Error('Trainer package not found');
  }
  return pkg;
};

export const createTrainerPackage = async (data: CreateTrainerPackageDto) => {
  if (!data.package_name || data.session_count === undefined || data.session_count === null || data.package_price === undefined || data.package_price === null || !data.trainer_level || !data.mode) {
    throw new Error('package_name, session_count, package_price, trainer_level và mode là bắt buộc');
  }

  if (data.session_count <= 0) {
    throw new Error('session_count phải lớn hơn 0');
  }

  if (data.package_price < 0) {
    throw new Error('package_price phải lớn hơn hoặc bằng 0');
  }

  if (!VALID_TRAINER_LEVELS.includes(data.trainer_level)) {
    throw new Error(`trainer_level phải là một trong: ${VALID_TRAINER_LEVELS.join(', ')}`);
  }

  if (!VALID_MODES.includes(data.mode)) {
    throw new Error(`mode phải là một trong: ${VALID_MODES.join(', ')}`);
  }

  const packageRepository = AppDataSource.getRepository(TrainerPackage);
  const newPackage = packageRepository.create({
    package_name: data.package_name,
    session_count: data.session_count,
    package_price: data.package_price,
    price_per_session: formatPricePerSession(data.package_price, data.session_count),
    trainer_level: data.trainer_level,
    mode: data.mode,
    description: data.description,
    is_active: data.is_active ?? true,
  });

  return packageRepository.save(newPackage);
};

export const updateTrainerPackage = async (id: number, data: UpdateTrainerPackageDto) => {
  const packageRepository = AppDataSource.getRepository(TrainerPackage);
  const pkg = await packageRepository.findOne({ where: { id } });

  if (!pkg) {
    throw new Error('Trainer package not found');
  }

  if (data.package_name !== undefined) pkg.package_name = data.package_name;
  if (data.session_count !== undefined) {
    if (data.session_count <= 0) {
      throw new Error('session_count phải lớn hơn 0');
    }
    pkg.session_count = data.session_count;
  }
  if (data.package_price !== undefined) {
    if (data.package_price < 0) {
      throw new Error('package_price phải lớn hơn hoặc bằng 0');
    }
    pkg.package_price = data.package_price;
  }

  if (data.trainer_level !== undefined) {
    if (!VALID_TRAINER_LEVELS.includes(data.trainer_level)) {
      throw new Error(`trainer_level phải là một trong: ${VALID_TRAINER_LEVELS.join(', ')}`);
    }
    pkg.trainer_level = data.trainer_level;
  }

  if (data.mode !== undefined) {
    if (!VALID_MODES.includes(data.mode)) {
      throw new Error(`mode phải là một trong: ${VALID_MODES.join(', ')}`);
    }
    pkg.mode = data.mode;
  }

  if (data.description !== undefined) pkg.description = data.description;
  if (data.is_active !== undefined) pkg.is_active = data.is_active;

  if (data.session_count !== undefined || data.package_price !== undefined) {
    const sessionCount = pkg.session_count;
    const packagePrice = pkg.package_price;
    pkg.price_per_session = formatPricePerSession(packagePrice, sessionCount);
  }

  return packageRepository.save(pkg);
};
