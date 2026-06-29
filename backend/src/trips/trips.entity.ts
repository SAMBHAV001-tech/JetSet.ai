import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('trip_plans')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  origin!: string;

  @Column()
  destination!: string;

  @Column({ type: 'date' })
  fromDate!: string;

  @Column({ type: 'date' })
  toDate!: string;

  @Column()
  budget!: string;

  @Column()
  companions!: string;

  @Column('simple-array')
  interests!: string[];

  @Column({ nullable: true })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

