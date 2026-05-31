import { AppDataSource } from '../config/data-source.js';
import { FAQ } from '../models/faq.entity.js';
import { CreateFaqDto, GetFaqsQueryDto } from '../dtos/faq.dto.js';

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
  'creator.id',
  'creator.full_name',
  'creator.email',
];

export const createFaq = async (createdBy: number, payload: CreateFaqDto) => {
  const faqRepository = AppDataSource.getRepository(FAQ);

  const isPublished = payload.is_published ?? false;

  const faq = faqRepository.create({
    created_by: createdBy,
    title: payload.title.trim(),
    content: payload.content.trim(),
    category: payload.category.trim(),
    is_published: isPublished,
    published_at: isPublished ? new Date() : undefined,
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
