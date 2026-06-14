import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity.js';
import { Shift } from './shift.entity.js';

@Entity('base_schedules')
@Unique('uq_base_schedule_user_day', ['user_id', 'day_of_week'])
export class BaseSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'day_of_week', type: 'int' })
  day_of_week!: number; // ISO 1..7 (1 = Mon, 7 = Sun)

  @Column({ name: 'shift_id', type: 'int', nullable: true })
  shift_id?: number | null;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift?: Shift | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
