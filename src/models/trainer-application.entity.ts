import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity.js";
import { TrainerApplicationCertificate } from "./trainer-application-certificate.entity.js";
import { ApplicationStatus, TrainerLevel } from "./trainer-status.enum.js";
import { Branch } from "./branch.entity.js";

@Entity("trainer_applications")
export class TrainerApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "int" })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: any;

  @Column({ name: "branch_id", type: "int", nullable: true })
  branch_id?: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: "branch_id" })
  branch?: Branch;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ type: "varchar", nullable: true })
  specialization?: string;

  @Column({ type: "text", nullable: true })
  avatar_url?: string;

  @Column({ type: "varchar", nullable: true })
  phone_number?: string;

  @Column({ type: "varchar", nullable: true })
  address?: string;

  @Column({ type: "int", nullable: true })
  years_experience?: number;

  @Column({
    name: "desired_level",
    type: "enum",
    enum: TrainerLevel,
    enumName: "trainer_level",
    nullable: true,
  })
  desired_level?: TrainerLevel;

  @Column({
    name: "approved_level",
    type: "enum",
    enum: TrainerLevel,
    enumName: "trainer_level",
    nullable: true,
  })
  approved_level?: TrainerLevel;

  @Column({ type: "numeric", nullable: true })
  hourly_rate?: number;

  @Column({ type: "varchar", nullable: true })
  identity_number?: string;

  @Column({ type: "text", nullable: true })
  identity_image_url?: string;

  @Column({
    type: "enum",
    enum: ApplicationStatus,
    enumName: "application_status",
    default: ApplicationStatus.Draft,
  })
  status!: ApplicationStatus;

  @Column({ type: "timestamp", nullable: true })
  submitted_at?: Date;

  @Column({ type: "timestamp", nullable: true })
  reviewed_at?: Date;

  @Column({ type: "int", nullable: true })
  reviewed_by?: number;

  @Column({ type: "text", nullable: true })
  rejection_reason?: string;

  @OneToMany(
    () => TrainerApplicationCertificate,
    (certificate) => certificate.application,
  )
  certificates!: TrainerApplicationCertificate[];

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
