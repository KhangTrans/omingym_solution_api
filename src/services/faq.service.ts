import { AppDataSource } from '../config/data-source.js';
import { FAQ } from '../models/faq.entity.js';
import { CreateFaqDto, GetFaqsQueryDto, UpdateFaqDto } from '../dtos/faq.dto.js';

const selectFaqWithCreator = [
  'faq.id',
  'faq.created_by',
  'faq.title',
  'faq.content',
  'faq.category',
  'faq.view_count',
  'faq.is_published',
  'faq.published_at',
  'faq.created_at',
  'faq.updated_at',
  'creator.id',
  'creator.full_name',
  'creator.email',
];

export const createFaq = async (createdBy: number, payload: CreateFaqDto) => {
  const faqRepository = AppDataSource.getRepository(FAQ);

  const isPublished = payload.is_published ?? false;

  const now = new Date(Date.now());

  const faq = faqRepository.create({
    created_by: createdBy,
    title: payload.title.trim(),
    content: payload.content.trim(),
    category: payload.category.trim(),
    is_published: isPublished,
    published_at: isPublished ? now : undefined,
    created_at: now,
    updated_at: now,
  });

  const savedFaq = await faqRepository.save(faq);

  return faqRepository
    .createQueryBuilder('faq')
    .leftJoinAndSelect('faq.creator', 'creator')
    .select(selectFaqWithCreator)
    .where('faq.id = :id', { id: savedFaq.id })
    .getOne();
};

export const fetchFaqs = async (query: GetFaqsQueryDto) => {
  const faqRepository = AppDataSource.getRepository(FAQ);

  const qb = faqRepository
    .createQueryBuilder('faq')
    .leftJoinAndSelect('faq.creator', 'creator')
    .select(selectFaqWithCreator)
    .orderBy('faq.created_at', 'DESC');

  if (query.category) {
    qb.andWhere('faq.category = :category', { category: query.category });
  }

  if (typeof query.is_published === 'boolean') {
    qb.andWhere('faq.is_published = :isPublished', {
      isPublished: query.is_published,
    });
  }

  return qb.getMany();
};

export const updateFaq = async (id: number, payload: UpdateFaqDto) => {
  const faqRepository = AppDataSource.getRepository(FAQ);
  const faq = await faqRepository.findOne({ where: { id } });

  if (!faq) {
    return null;
  }

  const wasPublished = faq.is_published;
  const isPublished = payload.is_published ?? false;

  faq.title = payload.title.trim();
  faq.content = payload.content.trim();
  faq.category = payload.category.trim();
  faq.is_published = isPublished;
  faq.published_at = isPublished && !wasPublished ? new Date(Date.now()) : isPublished ? faq.published_at : undefined;
  faq.updated_at = new Date(Date.now());

  await faqRepository.save(faq);

  return faqRepository
    .createQueryBuilder('faq')
    .leftJoinAndSelect('faq.creator', 'creator')
    .select(selectFaqWithCreator)
    .where('faq.id = :id', { id })
    .getOne();
};
