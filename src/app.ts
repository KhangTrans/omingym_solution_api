import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import faqRoutes from "./routes/faq.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import { AppDataSource } from "./config/data-source.js";
import { Role } from "./models/role.entity.js";
import trainerApplicationRoutes from "./routes/trainer-application.routes.js";

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

// Session Configuration
app.use(
  session({
    secret: process.env.AES_SECRET || "omnigym_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
);

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
        { role_name: "Partner", description: "Business Partner" },
      ]);
      console.log("Default roles seeded.");
    }
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/trainer-applications", trainerApplicationRoutes);

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
