import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/user.entity.js";
import { Role } from "../models/role.entity.js";
import { Customer } from "../models/customer.entity.js";
import { FAQ } from "../models/faq.entity.js";
import { Trainer } from "../models/trainer.entity.js";
import { Staff } from "../models/staff.entity.js";
import { Branch } from "../models/branch.entity.js";
import { BranchImage } from "../models/branch-image.entity.js";
import { BranchFacility } from "../models/branch-facility.entity.js";
import { BranchFacilityImage } from "../models/branch-facility-image.entity.js";
import { TrainerApplication } from "../models/trainer-application.entity.js";
import { TrainerApplicationCertificate } from "../models/trainer-application-certificate.entity.js";
import { TrainerCertificate } from "../models/trainer-certificate.entity.js";
import { MembershipPackage } from "../models/membership-package.entity.js";
import { MembershipBranch } from "../models/membership-branch.entity.js";
import { Post } from "../models/post.entity.js";
import { PostImage } from "../models/post-image.entity.js";
import { PostView } from "../models/post-view.entity.js";
import { CustomerSubscription } from "../models/customer-subscription.entity.js";
import { Transaction } from "../models/transaction.entity.js";
import { WorkShift } from "../models/work-shift.entity.js";
import { Attendance } from "../models/attendance.entity.js";
import { CustomerCheckIn } from "../models/customer-check-in.entity.js";
import { BranchReview } from "../models/branch-review.entity.js";
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
  synchronize: true, // Bật lại để TypeORM tạo bảng sạch
  logging: false,
  entities: [
    User,
    Role,
    Customer,
    Trainer,
    TrainerApplication,
    TrainerApplicationCertificate,
    TrainerCertificate,
    Staff,
    Branch,
    BranchImage,
    BranchFacility,
    BranchFacilityImage,
    FAQ,
    MembershipPackage,
    MembershipBranch,
    Post,
    PostImage,
    PostView,
    CustomerSubscription,
    Transaction,
    WorkShift,
    Attendance,
    CustomerCheckIn,
    BranchReview,
  ],

  migrations: [],
  subscribers: [],
});

