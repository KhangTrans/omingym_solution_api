import { Request, Response } from 'express';
import payOS from '../config/payos.js';
import { AppDataSource } from '../config/data-source.js';
import { MembershipPackage } from '../models/membership-package.entity.js';
import { Customer } from '../models/customer.entity.js';
import { CustomerSubscription } from '../models/customer-subscription.entity.js';
import { Transaction } from '../models/transaction.entity.js';
import { User } from '../models/user.entity.js';
import { sendBookingSuccessEmail } from '../utils/email.js';

/**
 * Helper to normalize and remove Vietnamese accents for PayOS compatibility (max 25 chars)
 */
const cleanString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '') // Keep alphanumeric and spaces
    .trim()
    .substring(0, 25);
};

/**
 * Shared helper to activate user subscription and send confirmation email immediately
 */
const activateSubscriptionAndSendEmail = async (
  transaction: Transaction,
  subscription: CustomerSubscription
) => {
  const subscriptionRepository = AppDataSource.getRepository(CustomerSubscription);
  const packageRepository = AppDataSource.getRepository(MembershipPackage);

  subscription.status = 'active';
  subscription.start_date = new Date();

  // Calculate end date based on membership package duration
  const membershipPackage = await packageRepository.findOne({
    where: { id: subscription.membership_id },
  });

  const durationMonths = membershipPackage?.duration_months || 1;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);
  subscription.end_date = endDate;

  await subscriptionRepository.save(subscription);
  console.log(`Successfully activated subscription ID ${subscription.id} for Customer ID ${subscription.customer_id}`);

  // Fetch Customer user relation to get the email and name
  const customerRepository = AppDataSource.getRepository(Customer);
  const customer = await customerRepository.findOne({
    where: { id: subscription.customer_id },
    relations: { user: true },
  });

  if (customer && customer.user && customer.user.email) {
    const userEmail = customer.user.email;
    const userName = customer.user.full_name || 'Khách hàng';
    const packageName = membershipPackage?.name || 'Gói tập';
    const packagePrice = Number(membershipPackage?.price || 0);

    try {
      await sendBookingSuccessEmail(
        userEmail,
        userName,
        packageName,
        packagePrice,
        subscription.start_date,
        endDate,
        transaction.id
      );
      console.log(`Booking success email sent to ${userEmail}`);
    } catch (mailErr) {
      console.error('Failed to send booking success email:', mailErr);
    }
  } else {
    console.warn(`Could not send booking success email: Customer user details or email not found for Subscription ID ${subscription.id}`);
  }
};

export const createMembershipPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập để thực hiện giao dịch này.' });
    }

    const { packageId } = req.body;
    if (!packageId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp packageId.' });
    }

    // 1. Fetch Membership Package
    const packageRepository = AppDataSource.getRepository(MembershipPackage);
    const membershipPackage = await packageRepository.findOne({ where: { id: Number(packageId) } });
    if (!membershipPackage) {
      return res.status(404).json({ message: 'Không tìm thấy gói thành viên này.' });
    }

    // 2. Fetch or create Customer Profile
    const customerRepository = AppDataSource.getRepository(Customer);
    let customer = await customerRepository.findOne({ where: { user_id: userId } });
    if (!customer) {
      customer = customerRepository.create({ user_id: userId });
      await customerRepository.save(customer);
    }

    // 3. Create a CustomerSubscription in 'pending' status
    const subscriptionRepository = AppDataSource.getRepository(CustomerSubscription);
    const subscription = subscriptionRepository.create({
      customer_id: customer.id,
      membership_id: membershipPackage.id,
      status: 'pending',
    });
    await subscriptionRepository.save(subscription);

    // 4. Create Transaction record in 'pending' status
    const transactionRepository = AppDataSource.getRepository(Transaction);
    const transaction = transactionRepository.create({
      customer_subscription_id: subscription.id,
      amount: Number(membershipPackage.price),
      payment_method: 'payOS',
      transaction_status: 'pending',
    });
    await transactionRepository.save(transaction);

    // 5. Generate PayOS Payment Link
    // orderCode must be a unique integer, so we use transaction.id
    const orderCode = transaction.id;
    const cleanPackageName = cleanString(membershipPackage.name) || 'OmniGym Package';
    const cleanDesc = cleanString(`Thanh toan goi ${membershipPackage.id}`) || 'Thanh toan goi tap';

    const paymentData = {
      orderCode,
      amount: Math.round(Number(membershipPackage.price)),
      description: cleanDesc,
      cancelUrl: process.env.PAYOS_CANCEL_URL || 'http://localhost:5173/payment/cancel',
      returnUrl: process.env.PAYOS_RETURN_URL || 'http://localhost:5173/payment/success',
      items: [
        {
          name: cleanPackageName,
          quantity: 1,
          price: Math.round(Number(membershipPackage.price)),
        },
      ],
    };

    const paymentLinkResponse = await payOS.paymentRequests.create(paymentData);

    // 6. Update Transaction with checkout URL and paymentLinkId
    transaction.checkout_url = paymentLinkResponse.checkoutUrl;
    transaction.payment_link_id = paymentLinkResponse.paymentLinkId;
    await transactionRepository.save(transaction);

    res.status(201).json({
      message: 'Tạo link thanh toán thành công',
      checkoutUrl: paymentLinkResponse.checkoutUrl,
      transactionId: transaction.id,
      orderCode,
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo link thanh toán.', error: error.message });
  }
};

export const handlePayOSWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Verify webhook signature
    const webhookBody = req.body;
    const verifiedData = await payOS.webhooks.verify(webhookBody);

    const transactionId = verifiedData.orderCode;
    console.log(`Received PayOS Webhook for Transaction ID: ${transactionId}, status: ${verifiedData.desc}`);

    const transactionRepository = AppDataSource.getRepository(Transaction);
    const subscriptionRepository = AppDataSource.getRepository(CustomerSubscription);
    const packageRepository = AppDataSource.getRepository(MembershipPackage);

    // 2. Fetch the corresponding Transaction
    const transaction = await transactionRepository.findOne({
      where: { id: transactionId },
      relations: { customer_subscription: true },
    });

    if (!transaction) {
      console.log(`Transaction with ID ${transactionId} not found. Acknowledging webhook anyway.`);
      return res.json({ success: true, message: 'Transaction not found.' });
    }

    // Prevent double processing
    if (transaction.transaction_status === 'paid') {
      return res.json({ success: true, message: 'Transaction already paid.' });
    }

    // 3. Process payment status
    // verifiedData.code === "00" is successful payment
    if (verifiedData.code === '00') {
      transaction.transaction_status = 'paid';
      transaction.payment_time = new Date();
      await transactionRepository.save(transaction);

      // Activate the subscription and send booking email
      if (transaction.customer_subscription) {
        await activateSubscriptionAndSendEmail(transaction, transaction.customer_subscription);
      }
    } else {
      // Payment was cancelled or failed
      transaction.transaction_status = 'cancelled';
      await transactionRepository.save(transaction);

      if (transaction.customer_subscription) {
        const subscription = transaction.customer_subscription;
        subscription.status = 'cancelled';
        await subscriptionRepository.save(subscription);
      }
      console.log(`Transaction ID ${transactionId} was cancelled/failed.`);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(400).json({ message: 'Webhook signature verification failed', error: error.message });
  }
};

export const getTransactionStatus = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp transactionId.' });
    }

    const transactionRepository = AppDataSource.getRepository(Transaction);
    const subscriptionRepository = AppDataSource.getRepository(CustomerSubscription);
    const packageRepository = AppDataSource.getRepository(MembershipPackage);

    const transaction = await transactionRepository.findOne({
      where: { id: Number(transactionId) },
      relations: { customer_subscription: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch này.' });
    }

    // If local status is still pending, double check with PayOS API for real-time state
    if (transaction.transaction_status === 'pending' && transaction.id) {
      try {
        const payosInfo = await payOS.paymentRequests.get(transaction.id);
        
        if (payosInfo.status === 'PAID') {
          // Update status locally as webhook might have been missed
          transaction.transaction_status = 'paid';
          transaction.payment_time = new Date();
          await transactionRepository.save(transaction);

          if (transaction.customer_subscription) {
            await activateSubscriptionAndSendEmail(transaction, transaction.customer_subscription);
          }
        } else if (payosInfo.status === 'CANCELLED') {
          transaction.transaction_status = 'cancelled';
          await transactionRepository.save(transaction);

          if (transaction.customer_subscription) {
            const subscription = transaction.customer_subscription;
            subscription.status = 'cancelled';
            await subscriptionRepository.save(subscription);
          }
        }
      } catch (payosErr) {
        console.error('Failed to retrieve latest status from PayOS API:', payosErr);
      }
    }

    // Return the updated status
    const updatedTransaction = await transactionRepository.findOne({
      where: { id: Number(transactionId) },
      relations: { customer_subscription: true },
    });

    res.json(updatedTransaction);
  } catch (error: any) {
    console.error('Error fetching transaction status:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy trạng thái giao dịch.', error: error.message });
  }
};
