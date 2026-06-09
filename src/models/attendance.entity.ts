import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity.js';
import { WorkShift } from './work-shift.entity.js';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shift_id', type: 'int', unique: true }) // Each shift can only have one attendance log
  shift_id!: number;

  @ManyToOne(() => WorkShift)
  @JoinColumn({ name: 'shift_id' })
  shift!: WorkShift;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'timestamp', name: 'check_in_time', nullable: true })
  check_in_time?: Date;

  @Column({ type: 'timestamp', name: 'check_out_time', nullable: true })
  check_out_time?: Date;

  @Column({ type: 'varchar', length: 20, default: 'absent' })
  status!: string; // 'present', 'late', 'absent', 'half_day'

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
