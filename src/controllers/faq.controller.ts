import { Request, Response } from 'express';
import { createFaq, fetchFaqs, updateFaq } from '../services/faq.service.js';
import { CreateFaqDto, GetFaqsQueryDto, UpdateFaqDto } from '../dtos/faq.dto.js';

const parsePublishedFilter = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const createFaqHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;

    const { title, content, category, is_published }: CreateFaqDto = req.body;

    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ tiêu đề, nội dung và danh mục FAQ.',
      });
    }

    if (typeof is_published !== 'undefined' && typeof is_published !== 'boolean') {
      return res.status(400).json({ message: 'Trạng thái xuất bản không hợp lệ.' });
    }

    const faq = await createFaq(userId, {
      title,
      content,
      category,
      is_published,
    });

    res.status(201).json(faq);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFaqHandler = async (req: Request, res: Response) => {
  try {
    const faqId = Number(req.params.id);

    if (!Number.isInteger(faqId) || faqId <= 0) {
      return res.status(400).json({ message: 'FAQ không hợp lệ.' });
    }

    const { title, content, category, is_published }: UpdateFaqDto = req.body;

    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ tiêu đề, nội dung và danh mục FAQ.',
      });
    }

    if (typeof is_published !== 'undefined' && typeof is_published !== 'boolean') {
      return res.status(400).json({ message: 'Trạng thái xuất bản không hợp lệ.' });
    }

    const faq = await updateFaq(faqId, {
      title,
      content,
      category,
      is_published,
    });

    if (!faq) {
      return res.status(404).json({ message: 'Không tìm thấy FAQ cần cập nhật.' });
    }

    res.json(faq);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFaqs = async (req: Request, res: Response) => {
  try {
    const query: GetFaqsQueryDto = {
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      is_published: parsePublishedFilter(req.query.is_published),
    };

    const faqs = await fetchFaqs(query);

    res.json(faqs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
