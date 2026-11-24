import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('especialidad')
export class Especialidad {
  @PrimaryGeneratedColumn({ name: 'especialidad_id' })
  especialidadId: number;

  @Column({ length: 100, unique: true })
  nombre: string;
}

