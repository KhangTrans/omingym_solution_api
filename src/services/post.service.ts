import { AppDataSource } from '../config/data-source.js';
import { Post } from '../models/post.entity.js';
import { CreatePostDto } from '../dtos/post.dto.js';
import { PostStatus } from '../models/post-status.enum.js';

export const createPost = async (authorId: number, postData: CreatePostDto, role: string) => {
  const postRepository = AppDataSource.getRepository(Post);

  const newPost = postRepository.create({
    content: postData.content,
    title: postData.title,
    user_id: authorId,
    status: PostStatus.Draft,
  });

  return await postRepository.save(newPost);
};

export const getAllPosts = async (userRole?: string, page: number = 1, limit: number = 10, search?: string) => {
  const postRepository = AppDataSource.getRepository(Post);
  
  const skip = (page - 1) * limit;
  const isInternal = userRole === 'Admin' || userRole === 'Staff' || userRole === 'Partner';

  const queryBuilder = postRepository.createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('post.images', 'images')
    .orderBy('post.created_at', 'DESC')
    .skip(skip)
    .take(limit);

  // Nếu không phải Admin/Staff/Partner thì chỉ lấy những bài đã publish
  if (!isInternal) {
    queryBuilder.andWhere('post.status = :status', { status: PostStatus.Published });
  }

  // Tìm kiếm theo tiêu đề hoặc nội dung nếu có
  if (search) {
    queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', { search: `%${search}%` });
  }

  const [posts, total] = await queryBuilder.getManyAndCount();

  return {
    posts,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
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

  const isInternal = userRole === 'Admin' || userRole === 'Staff' || userRole === 'Partner';

  // Nếu không phải nội bộ và bài chưa publish thì không cho xem
  if (!isInternal && post.status !== PostStatus.Published) {
    throw new Error('Bài viết chưa được công khai');
  }

  return post;
};

export const updatePost = async (id: number, userId: number, role: string, updateData: Partial<CreatePostDto>) => {
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

  Object.assign(post, updateData);
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
