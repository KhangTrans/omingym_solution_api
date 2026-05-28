import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import faqRoutes from './routes/faq.routes.js';
import { AppDataSource } from './config/data-source.js';
import { Role } from './models/role.entity.js';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true // Allow cookies/sessions
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
  secret: process.env.AES_SECRET || 'omnigym_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Database
AppDataSource.initialize()
  .then(async () => {
    console.log('Data Source has been initialized!');
    
    // Seed Roles
    const roleRepo = AppDataSource.getRepository(Role);
    const count = await roleRepo.count();
    if (count === 0) {
      await roleRepo.save([
        { role_name: 'Admin', description: 'System Administrator' },
        { role_name: 'Trainer', description: 'Gym Trainer' },
        { role_name: 'Customer', description: 'Gym Member' },
        { role_name: 'Staff', description: 'Gym Staff' },
        { role_name: 'Partner', description: 'Business Partner' }
      ]);
      console.log('Default roles seeded.');
    }
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err);
  });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/faqs', faqRoutes);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to OmniGym Solution API' });
});

export default app;
