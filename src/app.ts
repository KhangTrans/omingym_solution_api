import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { decryptTokenRSA } from './utils/crypto.js';

import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import faqRoutes from './routes/faq.routes.js';
import postRoutes from './routes/post.routes.js';
import branchRoutes from "./routes/branch.routes.js";
import { AppDataSource } from './config/data-source.js';
import { Role } from './models/role.entity.js';
import trainerApplicationRoutes from "./routes/trainer-application.routes.js";
import membershipPackageRoutes from './routes/membership-package.routes.js';
import trainerPackageRoutes from './routes/trainer-package.routes.js';
import trainerRoutes from "./routes/trainer.routes.js";
import paymentRoutes from './routes/payment.routes.js';
import workShiftRoutes from './routes/work-shift.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import customerCheckInRoutes from './routes/customer-check-in.routes.js';
import staffRoutes from './routes/staff.routes.js';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow cookies/sessions
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Global middleware to parse RSA Token and attach user to Request
app.use((req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decryptedUser = decryptTokenRSA(token);
      req.user = decryptedUser;
    } catch (error: any) {
      console.warn('Global token parse failed:', error.message);
    }
  }
  next();
});


// Initialize Database
AppDataSource.initialize()
  .then(async () => {
    console.log("Data Source has been initialized!");

    // Seed Roles
    const roleRepo = AppDataSource.getRepository(Role);
    const count = await roleRepo.count();
    if (count === 0) {
      await roleRepo.save([
        { role_name: "Admin", description: "System Administrator" },
        { role_name: "Trainer", description: "Gym Trainer" },
        { role_name: "Customer", description: "Gym Member" },
        { role_name: "Staff", description: "Gym Staff" },
        { role_name: "BranchManager", description: "Gym Branch Manager" },
      ]);
      console.log("Default roles seeded.");
    }
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/posts', postRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/trainer-applications", trainerApplicationRoutes);
app.use("/api/trainers", trainerRoutes);
app.use('/api/membership-packages', membershipPackageRoutes);
app.use('/api/trainer-packages', trainerPackageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/work-shifts', workShiftRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/customer-check-ins', customerCheckInRoutes);
app.use('/api/staffs', staffRoutes);


// Basic Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to OmniGym Solution API" });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
