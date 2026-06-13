import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'manager_id', type: 'int', nullable: true })
  manager_id?: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'manager_id' })
  manager?: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branch_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hotline?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 50, name: 'branch_ip', nullable: true })
  branch_ip?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  opening_house?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url?: string;

  @Column({ name: 'monthly_leave_limit', type: 'int', default: 0 })
  monthly_leave_limit!: number;
}
