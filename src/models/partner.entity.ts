import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  user_id!: number;

  @OneToOne(() => User, (user) => user.partner)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  business_license?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  application_status!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_name?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_code?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tag_line?: string;
}