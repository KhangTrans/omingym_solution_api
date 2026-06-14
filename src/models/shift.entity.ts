import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, name: 'shift_name' })
  shift_name!: string;

  @Column({ type: 'time', name: 'start_time' })
  start_time!: string; // 'HH:mm' or 'HH:mm:ss'

  @Column({ type: 'time', name: 'end_time' })
  end_time!: string;
}
