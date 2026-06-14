import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from "typeorm";
import { User } from "./user.entity.js";
import { Trainer } from "./trainer.entity.js";

/**
 * Bảng many-to-many giữa User (customer) và Trainer cho chức năng "Trainer yêu thích".
 * - Một user chỉ được lưu cùng 1 trainer 1 lần (unique).
 * - Bỏ lưu = xoá row.
 */
@Entity("favorite_trainers")
@Unique("uq_favorite_user_trainer", ["user_id", "trainer_id"])
export class FavoriteTrainer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "user_id", type: "int" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index()
  @Column({ name: "trainer_id", type: "int" })
  trainer_id!: number;

  @ManyToOne(() => Trainer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trainer_id" })
  trainer!: Trainer;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
