import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('faqs')
export class FAQ {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  created_by!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'int', default: 0 })
  view_count!: number;

  @Column({ type: 'boolean', default: false })
  is_published!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  published_at?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
