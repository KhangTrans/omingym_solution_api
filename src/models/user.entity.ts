import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  role_id!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 15, unique: true, nullable: true })
  phone_number?: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  full_name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url?: string;

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'text', nullable: true })
  medical_history?: string;

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  workout_goal?: string;

  @Column({ type: 'varchar', length: 20, default: 'inactive' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
