import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { MembershipPackage } from './membership-package.entity.js';
import { Branch } from './branch.entity.js';

@Entity('membership_branches')
export class MembershipBranch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'membership_id', type: 'int' })
  membership_id!: number;

  @ManyToOne(() => MembershipPackage, { eager: false })
  @JoinColumn({ name: 'membership_id' })
  membership!: MembershipPackage;

  @Column({ name: 'branch_id', type: 'int' })
  branch_id!: number;

  @ManyToOne(() => Branch, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
