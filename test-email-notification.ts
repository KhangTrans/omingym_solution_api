import { sendBookingSuccessEmail } from './src/utils/email.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log('Testing booking success email notification...');
  console.log('From User/Sender:', process.env.MAIL_USER);
  
  // Send email to the test address defined in test-email.ts or another address
  const recipient = 'khangtdce181439@fpt.edu.vn'; 
  console.log(`Sending test email to: ${recipient}`);

  try {
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 3); // 3-month subscription

    await sendBookingSuccessEmail(
      recipient,
      'Khang Trần',
      'Thành Viên Kim Cương - 3 Tháng',
      1200000, // 1,200,000 VND
      now,
      future,
      99999 // Test Transaction ID
    );

    console.log('SUCCESS: Email sent successfully! Please check the inbox.');
  } catch (error) {
    console.error('ERROR: Failed to send email:', error);
  }
}

runTest();
