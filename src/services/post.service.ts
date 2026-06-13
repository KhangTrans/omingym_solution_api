import { AppDataSource } from '../config/data-source.js';
import { Post } from '../models/post.entity.js';
import { PostView } from '../models/post-view.entity.js';
import { CreatePostDto } from '../dtos/post.dto.js';
import { PostStatus } from '../models/post-status.enum.js';

export const createPost = async (authorId: number, postData: CreatePostDto & { category?: string }, role: string) => {
  const postRepository = AppDataSource.getRepository(Post);

  const newPost = postRepository.create({
    content: postData.content,
    title: postData.title,
    category: postData.category || 'General',
    user_id: authorId,
    status: PostStatus.Draft,
  });

  return await postRepository.save(newPost);
};

export const getAllPosts = async (
  userRole?: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  category?: string,
  sortBy?: string,
  status?: string
) => {
  const postRepository = AppDataSource.getRepository(Post);

  const skip = (page - 1) * limit;
  const isInternal = userRole === 'Admin' || userRole === 'Staff' || userRole === 'BranchManager';

  const queryBuilder = postRepository.createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('post.images', 'images')
    .skip(skip)
    .take(limit);

  // Apply order/sorting
  if (sortBy === 'oldest') {
    queryBuilder.orderBy('post.created_at', 'ASC');
  } else if (sortBy === 'popular') {
    queryBuilder
      .orderBy('post.view_count', 'DESC')
      .addOrderBy('post.created_at', 'DESC');
  } else {
    queryBuilder.orderBy('post.created_at', 'DESC');
  }

  // Nếu không phải Admin/Staff/BranchManager thì chỉ lấy những bài đã publish
  if (!isInternal) {
    queryBuilder.andWhere('post.status = :status', { status: PostStatus.Published });
  } else if (status) {
    const upperStatus = status.toUpperCase();
    if (Object.values(PostStatus).includes(upperStatus as PostStatus)) {
      queryBuilder.andWhere('post.status = :status', { status: upperStatus });
    }
  }

  // Lọc theo category
  if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
    queryBuilder.andWhere('post.category ILIKE :category', { category: category.trim() });
  }

  // Tìm kiếm theo tiêu đề hoặc nội dung nếu có (loại bỏ các thẻ HTML để tránh tìm khớp các thuộc tính hoặc URL ảnh)
  if (search) {
    queryBuilder.andWhere(
      "(post.title ILIKE :search OR regexp_replace(coalesce(post.content, ''), '<[^>]*>', ' ', 'g') ILIKE :search)",
      { search: `%${search}%` }
    );
  }

  const [posts, total] = await queryBuilder.getManyAndCount();

  const responseMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };

  return {
    posts,
    meta: responseMeta,
    // Add compatibility properties for guest view
    data: posts,
    pagination: responseMeta
  };
};

export const approvePost = async (postId: number) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id: postId } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  post.status = PostStatus.Published;
  return await postRepository.save(post);
};

export const rejectPost = async (postId: number) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id: postId } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  post.status = PostStatus.Rejected;
  return await postRepository.save(post);
};

export const submitPostForApproval = async (postId: number, userId: number, role: string) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id: postId } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  if (post.user_id !== userId && role !== 'Admin') {
    throw new Error('Bạn không có quyền gửi duyệt bài viết này');
  }

  if (post.status !== PostStatus.Draft && post.status !== PostStatus.Rejected) {
    throw new Error('Bài viết không ở trạng thái có thể gửi duyệt');
  }

  post.status = PostStatus.Pending;
  return await postRepository.save(post);
};

export const getPostById = async (id: number, userRole?: string) => {
  const postRepository = AppDataSource.getRepository(Post);

  const query: any = {
    where: { id },
    relations: { user: { role: true }, images: true }
  };

  const post = await postRepository.findOne(query);

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  const isInternal = userRole === 'Admin' || userRole === 'Staff' || userRole === 'BranchManager';

  // Nếu không phải nội bộ và bài chưa publish thì không cho xem
  if (!isInternal && post.status !== PostStatus.Published) {
    throw new Error('Bài viết chưa được công khai');
  }

  return post;
};

export const updatePost = async (id: number, userId: number, role: string, updateData: Partial<CreatePostDto> & { category?: string; status?: PostStatus }) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  // Ràng buộc: Chỉ chính tác giả hoặc Admin mới được sửa
  if (post.user_id !== userId && role !== 'Admin') {
    throw new Error('Bạn không có quyền chỉnh sửa bài viết này');
  }

  // Nếu chỉnh sửa bài đã công khai, hạ về draft để chờ duyệt lại
  if (post.status === PostStatus.Published && role !== 'Admin') {
    post.status = PostStatus.Draft;
  }

  // Chỉ cập nhật các field nội dung được phép.
  if (typeof updateData.title === 'string') {
    post.title = updateData.title;
  }

  if (typeof updateData.content === 'string') {
    post.content = updateData.content;
  }

  if (typeof updateData.category === 'string') {
    post.category = updateData.category;
  }

  if (role === 'Admin' && updateData.status && Object.values(PostStatus).includes(updateData.status)) {
    post.status = updateData.status;
  }

  return await postRepository.save(post);
};

export const deletePost = async (id: number, userId: number, role: string) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  // Ràng buộc: Chỉ tác giả hoặc Admin mới được xóa
  if (post.user_id !== userId && role !== 'Admin') {
    throw new Error('Bạn không có quyền xóa bài viết này');
  }

  return await postRepository.remove(post);
};

const syncPostViewCount = async (postId: number) => {
  const postViewRepository = AppDataSource.getRepository(PostView);
  const postRepository = AppDataSource.getRepository(Post);

  const viewCount = await postViewRepository.count({ where: { post_id: postId } });
  await postRepository.update(postId, { view_count: viewCount });

  return viewCount;
};

/**
 * Track a view for a post by a user.
 * Rules:
 *  - Only roles 'Customer' and 'Trainer' count as views
 *  - Each (user_id, post_id) pair can only count once per calendar day
 */
export const trackView = async (postId: number, userId: number, userRole: string) => {
  const postRepository = AppDataSource.getRepository(Post);
  const post = await postRepository.findOne({ where: { id: postId } });

  if (!post) {
    throw new Error('Không tìm thấy bài viết');
  }

  const countableRoles = ['Customer', 'Trainer'];
  if (!countableRoles.includes(userRole)) {
    const viewCount = await syncPostViewCount(postId);
    return { success: true, alreadyViewed: false, skipped: true, viewCount };
  }

  const postViewRepository = AppDataSource.getRepository(PostView);
  const todayDate = new Date().toISOString().slice(0, 10);

  const existing = await postViewRepository.findOne({
    where: { post_id: postId, user_id: userId, viewed_date: todayDate },
  });

  if (existing) {
    const viewCount = await syncPostViewCount(postId);
    return { success: true, alreadyViewed: true, viewCount };
  }

  try {
    const viewRecord = postViewRepository.create({
      post_id: postId,
      user_id: userId,
      viewed_date: todayDate,
    });
    await postViewRepository.save(viewRecord);

    const viewCount = await syncPostViewCount(postId);
    return { success: true, alreadyViewed: false, viewCount };
  } catch (err: any) {
    if (err?.code === '23505') {
      const viewCount = await syncPostViewCount(postId);
      return { success: true, alreadyViewed: true, viewCount };
    }
    throw err;
  }
};
