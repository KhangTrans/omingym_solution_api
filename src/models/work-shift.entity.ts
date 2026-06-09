import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity.js';
import { Branch } from './branch.entity.js';

@Entity('work_shifts')
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

  @Column({ type: 'varchar', length: 10, name: 'start_time' })
  start_time!: string; // HH:mm format, e.g. "08:00"

  @Column({ type: 'varchar', length: 10, name: 'end_time' })
  end_time!: string; // HH:mm format, e.g. "17:00"

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: string; // 'scheduled', 'completed', 'cancelled'

  @Column({ type: 'varchar', length: 10, name: 'check_in_code', nullable: true })
  check_in_code?: string; // 6-digit uppercase code

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
