import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Role } from './role.entity.js';
import { Customer } from './customer.entity.js';
import { Trainer } from './trainer.entity.js';
import { Staff } from './staff.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  role_id!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @OneToOne(() => Customer, (customer) => customer.user)
  customer?: Customer;

  @OneToOne(() => Trainer, (trainer) => trainer.user)
  trainer?: Trainer;

  @OneToOne(() => Staff, (staff) => staff.user)
  staff?: Staff;

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

  @Column({ type: 'varchar', length: 20, default: 'inactive' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  face_embedding?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
