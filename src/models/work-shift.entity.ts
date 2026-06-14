import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from './user.entity.js';
import { Branch } from './branch.entity.js';
import { Shift } from './shift.entity.js';
import { WorkShiftStatus } from './work-shift-status.enum.js';

@Entity('work_shifts')
@Unique('uq_work_shift_user_date', ['user_id', 'date'])
export class WorkShift {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'branch_id', type: 'int' })
  branch_id!: number;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ name: 'shift_id', type: 'int', nullable: true })
  shift_id?: number | null;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift?: Shift | null;

  @Column({ type: 'varchar', length: 20, default: WorkShiftStatus.Scheduled })
  status!: WorkShiftStatus;

  @Column({ type: 'varchar', length: 10, name: 'check_in_code', nullable: true })
  check_in_code?: string; // 6-digit uppercase code

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
