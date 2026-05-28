import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity.js';
import { Partner } from './partner.entity.js';

@Entity('trainers')
export class Trainer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.trainer)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'partner_id', type: 'int', nullable: true })
  partner_id?: number;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner?: Partner;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  certificates?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  specialization?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;
}