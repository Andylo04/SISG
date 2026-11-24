
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Municipio } from '../../municipios/entities/municipio.entity.js';

@Entity('hospital_privado')
export class Hospital {
  @PrimaryGeneratedColumn({ name: 'hospital_id' })
  hospitalId: number;

  @Column({
    name: 'codigo_establecimiento',
    type: 'varchar',
    length: 20,
    unique: true,
  })
  codigoEstablecimiento: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  nit: string | null;

  @Column({
    name: 'tipo_hospital',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  tipoHospital: string | null;

  @Column({ name: 'num_camas', type: 'int', nullable: true })
  numCamas: number | null;

  @Column({ name: 'municipio_id', type: 'int', nullable: true })
  municipioId: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'fecha_registro', type: 'date', nullable: true })
  fechaRegistro: string | null;

  @ManyToOne(() => Municipio, { nullable: true })
  @JoinColumn({ name: 'municipio_id' })
  municipio: Municipio | null;
}
