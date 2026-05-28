import { Request, Response } from 'express';
import { fetchFaqs } from '../services/faq.service.js';

export const getFaqs = async (req: Request, res: Response) => {
  try {
    const publishedOnly = req.query.publishedOnly === 'true' || req.query.publishedOnly === '1';
    const faqs = await fetchFaqs(publishedOnly);
    res.json(faqs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};