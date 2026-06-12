import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity.js";
import { Branch } from "./branch.entity.js";
import { TrainerApplication } from "./trainer-application.entity.js";
import { TrainerCertificate } from "./trainer-certificate.entity.js";

import { TrainerLevel } from "./trainer-status.enum.js";

@Entity("trainers")
export class Trainer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "int", unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.trainer)
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

  @Column({ type: "numeric", default: 0 })
  rating!: number;

  @Column({ name: "years_experience", type: "int", default: 0 })
  years_experience!: number;

  @Column({
    type: "enum",
    enum: TrainerLevel,
    enumName: "trainer_level",
    nullable: true,
  })
  level?: TrainerLevel;

  @Column({ name: "application_id", type: "int", unique: true, nullable: true })
  application_id?: number;

  @OneToOne(() => TrainerApplication)
  @JoinColumn({ name: "application_id" })
  application!: TrainerApplication;

  @Column({ type: "text", nullable: true })
  avatar_url?: string;

  @Column({ type: "varchar", nullable: true })
  phone_number?: string;

  @Column({ type: "varchar", nullable: true })
  address?: string;

  @Column({ type: "numeric", nullable: true })
  hourly_rate?: number;

  @Column({ type: "int", default: 0 })
  review_count!: number;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "timestamp", nullable: true })
  approved_at?: Date;

  @Column({ type: "int", nullable: true })
  approved_by?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approver?: any;

  @OneToMany(() => TrainerCertificate, (certificate) => certificate.trainer)
  certificates!: TrainerCertificate[];

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
