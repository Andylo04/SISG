
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Especialidad } from '../../especialidades/entities/especialidad.entity.js';

@Entity('medico')
export class Medico {
  @PrimaryGeneratedColumn({ name: 'medico_id' })
  medicoId: number;

  @Column({
    name: 'numero_colegiado',
    type: 'varchar',
    length: 15,
    unique: true,
  })
  numeroColegiado: string;

  @Column({ type: 'varchar', length: 100 })
  nombres: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos: string;

  @Column({
    type: 'char',
    length: 1,
    nullable: true,
  })
  sexo: string | null;

  @Column({
    name: 'fecha_nacimiento',
    type: 'date',
    nullable: true,
  })
  fechaNacimiento: string | null;

  @Column({
    name: 'especialidad_id',
    type: 'int',
    nullable: true,
  })
  especialidadId: number | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  email: string | null;

  @Column({
    name: 'telefono',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  telefono: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  activo: boolean;

  @Column({
    name: 'fuente_origen',
    type: 'varchar',
    length: 10,
  })
  fuenteOrigen: string;

  @CreateDateColumn({
    name: 'fecha_registro',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro: Date;

  @ManyToOne(() => Especialidad, {
    nullable: true,
  })
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad | null;
}
