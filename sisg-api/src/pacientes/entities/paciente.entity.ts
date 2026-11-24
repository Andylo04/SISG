
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Municipio } from '../../municipios/entities/municipio.entity.js';

@Entity('paciente')
export class Paciente {
  @PrimaryGeneratedColumn({ name: 'paciente_id' })
  pacienteId: number;

  @Column({
    name: 'dpi_hash',
    type: 'char',
    length: 64,
  })
  dpiHash: string;

  @Column({
    type: 'varchar',
    length: 20,
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
    name: 'municipio_id',
    type: 'int',
    nullable: true,
  })
  municipioId: number | null;

  @Column({
    name: 'fecha_registro',
    type: 'date',
    nullable: true,
  })
  fechaRegistro: string | null;

  @ManyToOne(() => Municipio, { nullable: true })
  @JoinColumn({ name: 'municipio_id' })
  municipio: Municipio | null;
}
