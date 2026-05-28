import { AppDataSource } from '../config/data-source.js';
import { Faq } from '../models/faq.entity.js';
import { getCache, setCache } from '../utils/cache.js';

export type FaqResponse = {
  id: number;
  created_by: number;
  author_email: string | null;
  title: string;
  content: string;
  category: string;
  view_count: number;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
};

const FAQ_ALL_CACHE_KEY = 'faqs:all';
const FAQ_PUBLISHED_CACHE_KEY = 'faqs:published';

const FAQ_CREATOR_FIELDS = ['creator.id', 'creator.email'] as const;

function mapFaqResponse(faq: Faq): FaqResponse {
  return {
    id: faq.id,
    created_by: faq.created_by,
    author_email: faq.createdBy?.email ?? null,
    title: faq.title,
    content: faq.content,
    category: faq.category,
    view_count: faq.view_count,
    is_published: faq.is_published,
    published_at: faq.published_at,
    created_at: faq.created_at,
  };
}

async function findFaqs(publishedOnly: boolean = false) {
  const faqRepository = AppDataSource.getRepository(Faq);
  const query = faqRepository
    .createQueryBuilder('faq')
    .leftJoinAndSelect('faq.createdBy', 'creator')
    .select([
      'faq.id',
      'faq.created_by',
      'faq.title',
      'faq.content',
      'faq.category',
      'faq.view_count',
      'faq.is_published',
      'faq.published_at',
      'faq.created_at',
      ...FAQ_CREATOR_FIELDS,
    ])
    .orderBy('faq.created_at', 'DESC');

  if (publishedOnly) {
    query.where('faq.is_published = :isPublished', { isPublished: true });
  }

  return query.getMany();
}

export const fetchFaqs = async (publishedOnly: boolean = false) => {
  const cacheKey = publishedOnly ? FAQ_PUBLISHED_CACHE_KEY : FAQ_ALL_CACHE_KEY;
  const cachedFaqs = await getCache<FaqResponse[]>(cacheKey);

  if (cachedFaqs) {
    return cachedFaqs;
  }

  const faqs = await findFaqs(publishedOnly);
  const response = faqs.map(mapFaqResponse);
  await setCache(cacheKey, response, 300);
  return response;
};