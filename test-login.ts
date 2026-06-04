import { AppDataSource } from './src/config/data-source.js';
import { loginUser } from './src/services/auth.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Database initialized.');

  const email = 'trank7866@gmail.com';
  const password = 'GLT#2632';

  console.log(`Attempting login for: ${email}`);

  try {
    const user = await loginUser(email, password);
    console.log('\n======================================================');
    console.log('LOGIN SUCCESSFUL!');
    console.log('======================================================');
    console.log(`User ID   : ${user.id}`);
    console.log(`Full Name : ${user.full_name}`);
    console.log(`Email     : ${user.email}`);
    console.log(`Role ID   : ${user.role_id}`);
    console.log(`Role Name : ${user.role?.role_name}`);
    console.log(`Status    : ${user.status}`);
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('\n======================================================');
    console.error('LOGIN FAILED!');
    console.error('======================================================');
    console.error('Error:', error.message);
    console.error('======================================================\n');
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection closed.');
  }
}

runTest();
