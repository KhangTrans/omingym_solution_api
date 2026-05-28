import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('staffs')
export class Staff {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.staff)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department?: string;

  @Column({ type: 'int', default: 0 })
  assigned_tasks_count!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}