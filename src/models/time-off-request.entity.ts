import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { TimeOffRequestStatus } from './work-shift-status.enum.js';

@Entity('time_off_requests')
export class TimeOffRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 20, default: TimeOffRequestStatus.Pending })
  status!: TimeOffRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewed_by?: number;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewed_at?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
