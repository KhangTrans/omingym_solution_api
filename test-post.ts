import { AppDataSource } from './src/config/data-source.js';
import { createPost, getAllPosts, approvePost } from './src/services/post.service.js';
import { User } from './src/models/user.entity.js';
import { Role } from './src/models/role.entity.js';

async function testPostFeature() {
  try {
    await AppDataSource.initialize();
    console.log('Database initialized');

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);

    // 1. Lấy thông tin Role
    const roles = await roleRepo.find();
    const adminRole = roles.find(r => r.role_name === 'Admin');
    const staffRole = roles.find(r => r.role_name === 'Staff');
    const partnerRole = roles.find(r => r.role_name === 'Partner');

    if (!adminRole || !staffRole || !partnerRole) {
      console.log('Roles not found. Please seed roles first.');
      return;
    }

    // 2. Tìm hoặc tạo user test cho từng role
    const getOrCreateUser = async (email: string, roleId: number, name: string) => {
      let user = await userRepo.findOne({ 
        where: { email }, 
        relations: { role: true } 
      });
      if (!user) {
        user = userRepo.create({
          email,
          password: 'password123',
          full_name: name,
          role_id: roleId,
          status: 'active'
        });
        await userRepo.save(user);
        user = await userRepo.findOne({ 
          where: { email }, 
          relations: { role: true } 
        });
      }
      return user!;
    };

    const adminUser = await getOrCreateUser('admin_test@test.com', adminRole.id, 'Admin Test');
    const staffUser = await getOrCreateUser('staff_test@test.com', staffRole.id, 'Staff Test');
    const partnerUser = await getOrCreateUser('partner_test@test.com', partnerRole.id, 'Partner Test');

    console.log('Test Users ready');

    // 3. Test Staff tạo bài (phải chờ duyệt)
    console.log('\n--- Testing Staff Post ---');
    const staffPost = await createPost(staffUser.id, {
      title: 'Staff Post Title',
      content: 'This post by staff should be unpublished'
    }, 'Staff');
    console.log('Staff Post created. status:', staffPost.status);

    // 4. Test Partner tạo bài (publish ngay)
    console.log('\n--- Testing Partner Post ---');
    const partnerPost = await createPost(partnerUser.id, {
      title: 'Partner Post Title',
      content: 'This post by partner should be published immediately'
    }, 'Partner');
    console.log('Partner Post created. status:', partnerPost.status);

    // 5. Kiểm tra getAllPosts cho User thường (không thấy bài Staff)
    console.log('\n--- Testing getAllPosts (Public) ---');
    const publicPosts = await getAllPosts(false);
    const hasStaffPost = publicPosts.some(p => p.id === staffPost.id);
    const hasPartnerPost = publicPosts.some(p => p.id === partnerPost.id);
    console.log('Public view - Has Staff Post:', hasStaffPost);
    console.log('Public view - Has Partner Post:', hasPartnerPost);

    // 6. Kiểm tra getAllPosts cho Admin (thấy hết)
    console.log('\n--- Testing getAllPosts (Admin) ---');
    const adminPosts = await getAllPosts(true);
    const adminHasStaffPost = adminPosts.some(p => p.id === staffPost.id);
    console.log('Admin view - Has Staff Post:', adminHasStaffPost);

    // 7. Test Admin duyệt bài Staff
    console.log('\n--- Testing Admin Approval ---');
    await approvePost(staffPost.id);
    const approvedStaffPost = await AppDataSource.getRepository('Post').findOne({ where: { id: staffPost.id } }) as any;
    console.log('Staff Post after approval. status:', approvedStaffPost?.status);

    console.log('\n--- ALL TESTS COMPLETED ---');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testPostFeature();
