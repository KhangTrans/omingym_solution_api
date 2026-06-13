import { Request, Response, NextFunction } from 'express';
import { decryptTokenRSA } from '../utils/crypto.js';

/**
 * Middleware để kiểm tra xem người dùng đã đăng nhập bằng Bearer RSA token.
 * Không dùng session nữa.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decryptedUser = decryptTokenRSA(token);
        req.user = decryptedUser;
      } catch (error: any) {
        return res.status(401).json({
          message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
        });
      }
    }
  }

  if (req.user) {
    return next();
  }

  return res.status(401).json({
    message: 'Bạn cần đăng nhập để thực hiện chức năng này.'
  });
};

/**
 * Middleware để kiểm tra quyền hạn (Role).
 * Sử dụng sau khi đã gọi isAuthenticated.
 * Ví dụ: authorizeRole(['Admin'])
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập vào chức năng này.'
      });
    }

    next();
  };
};
