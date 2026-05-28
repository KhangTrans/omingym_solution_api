import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './partner.entity.js';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'partner_id', type: 'int' })
  partner_id!: number;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner!: Partner;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branch_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hotline?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  opening_house?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url?: string;
}