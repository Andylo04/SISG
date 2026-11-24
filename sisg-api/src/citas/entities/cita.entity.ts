
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

@Entity('cita')
export class Cita {
  @PrimaryGeneratedColumn({ name: 'cita_id' })
  citaId: number;

  @Column({ name: 'paciente_id', type: 'int' })
  pacienteId: number;

  @Column({ name: 'medico_id', type: 'int' })
  medicoId: number;

  @Column({ name: 'hospital_id', type: 'int' })
  hospitalId: number;

  @Column({ name: 'fecha_hora_programada', type: 'datetime' })
  fechaHoraProgramada: Date;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  estado: string | null;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Medico)
  @JoinColumn({ name: 'medico_id' })
  medico: Medico;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;
}
