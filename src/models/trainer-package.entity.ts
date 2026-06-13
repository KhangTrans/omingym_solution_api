import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('trainer_packages')
export class TrainerPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  package_name!: string;

  @Column({ type: 'int' })
  session_count!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  package_price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price_per_session!: number;

  @Column({ type: 'varchar', length: 20 })
  trainer_level!: string;

  @Column({ type: 'varchar', length: 20 })
  mode!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
