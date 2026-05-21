import { Request, Response, NextFunction } from 'express';

/**
 * Middleware để kiểm tra xem người dùng đã đăng nhập (có session) chưa.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
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
    const userRole = req.session?.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập vào chức năng này.' 
      });
    }

    next();
  };
};
