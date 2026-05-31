import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/user.entity.js";
import { Role } from "../models/role.entity.js";
import { Customer } from "../models/customer.entity.js";
import { FAQ } from "../models/faq.entity.js";
import { Partner } from "../models/partner.entity.js";
import { Trainer } from "../models/trainer.entity.js";
import { Staff } from "../models/staff.entity.js";
import { Branch } from "../models/branch.entity.js";
import { BranchImage } from "../models/branch-image.entity.js";
import { BranchFacility } from "../models/branch-facility.entity.js";
import { TrainerApplication } from "../models/trainer-application.entity.js";
import { TrainerApplicationCertificate } from "../models/trainer-application-certificate.entity.js";
import { TrainerCertificate } from "../models/trainer-certificate.entity.js";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false, // Set to false in production
  logging: false,
  entities: [
    User,
    Role,
    Customer,
    Partner,
    Trainer,
    TrainerApplication,
    TrainerApplicationCertificate,
    TrainerCertificate,
    Staff,
    Branch,
    BranchImage,
    BranchFacility,
    FAQ,
  ],
  migrations: [],
  subscribers: [],
});
