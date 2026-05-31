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
import { Partner } from "./partner.entity.js";
import { TrainerApplication } from "./trainer-application.entity.js";
import { TrainerCertificate } from "./trainer-certificate.entity.js";

@Entity("trainers")
export class Trainer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "int", unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.trainer)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "partner_id", type: "int", nullable: true })
  partner_id?: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: "partner_id" })
  partner?: Partner;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ type: "varchar", nullable: true })
  specialization?: string;

  @Column({ type: "numeric", default: 0 })
  rating!: number;

  @Column({ name: "years_experience", type: "int", default: 0 })
  years_experience!: number;

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
  approver?: User;

  @OneToMany(() => TrainerCertificate, (certificate) => certificate.trainer)
  certificates!: TrainerCertificate[];

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
