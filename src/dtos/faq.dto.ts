export interface GetFaqsQueryDto {
  category?: string;
  is_published?: boolean;
}

export interface CreateFaqDto {
  title: string;
  content: string;
  category: string;
  is_published?: boolean;
}

export interface UpdateFaqDto {
  title: string;
  content: string;
  category: string;
  is_published?: boolean;
}
