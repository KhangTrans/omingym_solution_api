import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Format helper for currency
 */
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + ' đ';
};

/**
 * Format helper for date to DD/MM/YYYY
 */
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Sends a booking success email to the user with booking receipt details.
 */
export const sendBookingSuccessEmail = async (
  toEmail: string,
  fullName: string,
  packageName: string,
  price: number,
  startDate: Date,
  endDate: Date,
  transactionId: number
) => {
  const mailFrom = process.env.MAIL_FROM || `"OmniGym" <${process.env.MAIL_USER}>`;
  
  const formattedPrice = formatCurrency(price);
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đăng ký gói tập thành công tại OmniGym</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #121212;
          color: #e0e0e0;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #1a1a1a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          border: 1px solid #2d2d2d;
        }
        .header {
          background-color: #000000;
          padding: 30px;
          text-align: center;
          border-bottom: 2px solid #84cc16; /* Vibrant Lime Accent */
        }
        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .logo span {
          color: #84cc16;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #a3a3a3;
          margin-bottom: 30px;
        }
        .receipt-card {
          background-color: #242424;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #333333;
          margin-bottom: 30px;
        }
        .receipt-title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #444444;
          padding-bottom: 10px;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 15px;
        }
        .receipt-row:last-child {
          margin-bottom: 0;
        }
        .receipt-label {
          color: #888888;
          font-weight: 500;
        }
        .receipt-value {
          color: #ffffff;
          font-weight: 600;
          text-align: right;
        }
        .highlight-value {
          color: #84cc16;
          font-size: 16px;
        }
        .footer {
          background-color: #0c0c0c;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #666666;
          border-top: 1px solid #222222;
        }
        .footer a {
          color: #84cc16;
          text-decoration: none;
        }
        .cta-button {
          display: inline-block;
          background-color: #84cc16;
          color: #000000 !important;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          padding: 12px 30px;
          border-radius: 6px;
          text-align: center;
          margin: 10px auto 25px auto;
          box-shadow: 0 4px 15px rgba(132, 204, 22, 0.3);
          transition: background-color 0.2s ease;
        }
        .cta-container {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">OMNI<span>GYM</span></div>
        </div>
        <div class="content">
          <div class="greeting">Xin chào ${fullName},</div>
          <div class="message">
            Chúc mừng bạn đã đăng ký thành công gói dịch vụ tại <strong>OmniGym</strong>! Giao dịch thanh toán của bạn đã được xác nhận. Dưới đây là thông tin chi tiết về gói tập của bạn:
          </div>
          
          <div class="receipt-card">
            <div class="receipt-title">Thông Tin Đăng Ký</div>
            
            <div class="receipt-row" style="margin-bottom: 12px; clear: both;">
              <span class="receipt-label" style="float: left;">Mã giao dịch:</span>
              <span class="receipt-value" style="float: right;">#${transactionId}</span>
            </div>
            <div style="clear: both; height: 1px; margin-bottom: 12px;"></div>
            
            <div class="receipt-row" style="margin-bottom: 12px; clear: both;">
              <span class="receipt-label" style="float: left;">Gói tập:</span>
              <span class="receipt-value" style="float: right;">${packageName}</span>
            </div>
            <div style="clear: both; height: 1px; margin-bottom: 12px;"></div>
            
            <div class="receipt-row" style="margin-bottom: 12px; clear: both;">
              <span class="receipt-label" style="float: left;">Giá tiền:</span>
              <span class="receipt-value highlight-value" style="float: right;">${formattedPrice}</span>
            </div>
            <div style="clear: both; height: 1px; margin-bottom: 12px;"></div>
            
            <div class="receipt-row" style="margin-bottom: 12px; clear: both;">
              <span class="receipt-label" style="float: left;">Ngày bắt đầu:</span>
              <span class="receipt-value" style="float: right;">${formattedStartDate}</span>
            </div>
            <div style="clear: both; height: 1px; margin-bottom: 12px;"></div>
            
            <div class="receipt-row" style="margin-bottom: 0; clear: both;">
              <span class="receipt-label" style="float: left;">Ngày kết thúc:</span>
              <span class="receipt-value" style="float: right;">${formattedEndDate}</span>
            </div>
            <div style="clear: both;"></div>
          </div>
          
          <div class="cta-container">
            <a href="http://localhost:5173" class="cta-button">Khám Phá Phòng Tập Ngay</a>
          </div>
          
          <div class="message" style="margin-bottom: 0;">
            Hãy mang theo email này hoặc mã giao dịch khi đến phòng tập để được hỗ trợ nhận thẻ thành viên và bắt đầu hành trình thay đổi bản thân cùng OmniGym nhé!
          </div>
        </div>
        <div class="footer">
          Đây là email tự động từ hệ thống OmniGym. Vui lòng không phản hồi email này.<br>
          Nếu cần hỗ trợ, xin vui lòng liên hệ: <a href="mailto:support@omnigym.vn">support@omnigym.vn</a> hoặc Hotline: <strong>1900 xxxx</strong>.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: mailFrom,
    to: toEmail,
    subject: `[OmniGym] Đăng Ký Thành Công Gói Tập ${packageName}`,
    html: htmlContent,
  });
};
