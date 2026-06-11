import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity.js';
import { CustomerSubscription } from './customer-subscription.entity.js';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.customer)
  @JoinColumn({ name: 'user_id' })
  user!: any;

  @OneToMany(() => CustomerSubscription, (subscription) => subscription.customer)
  subscriptions?: CustomerSubscription[];

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  medical_history?: string;

  @Column({ type: 'text', nullable: true })
  workout_goal?: string;
}