
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Paciente } from '../../pacientes/entities/paciente.entity.js';
import { Medico } from '../../medicos/entities/medico.entity.js';
import { Hospital } from '../../hospitales/entities/hospital.entity.js';

@Entity('hospitalizacion')
export class Hospitalizacion {
  @PrimaryGeneratedColumn({ name: 'hospitalizacion_id' })
  hospitalizacionId: number;

  @Column({ name: 'paciente_id', type: 'int' })
  pacienteId: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ name: 'hospital_id', type: 'int' })
  hospitalId: number;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'medico_id', type: 'int' })
  medicoId: number;

  @ManyToOne(() => Medico)
  @JoinColumn({ name: 'medico_id' })
  medico: Medico;

  @Column({
    name: 'cie10_ingreso',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cie10Ingreso: string | null;

  @Column({
    name: 'fecha_ingreso',
    type: 'datetime',
  })
  fechaIngreso: Date;

  @Column({
    name: 'fecha_egreso',
    type: 'datetime',
    nullable: true,
  })
  fechaEgreso: Date | null;

  @Column({
    name: 'tipo_egreso',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  tipoEgreso: string | null;

  @Column({
    name: 'monto_facturado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  montoFacturado: string | null;

  @Column({
    name: 'codigo_aseguradora',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  codigoAseguradora: string | null;
}
