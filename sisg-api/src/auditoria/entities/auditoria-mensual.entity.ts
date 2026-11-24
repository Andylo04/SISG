
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('auditoria_mensual')
@Unique('uk_auditoria_periodo', ['mes', 'año'])
export class AuditoriaMensual {
  @PrimaryGeneratedColumn({
    name: 'auditoria_id',
  })
  auditoriaId: number;

  @Column({ type: 'int' })
  mes: number;

  @Column({ name: 'año', type: 'int' })
  año: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'Pendiente',
  })
  estado: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  conclusiones: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  recomendaciones: string | null;

  @Column({
    name: 'revisado_por',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  revisadoPor: string | null;

  @Column({
    name: 'fecha_revision',
    type: 'datetime',
    nullable: true,
  })
  fechaRevision: Date | null;

  @Column({
    name: 'fecha_cierre',
    type: 'datetime',
    nullable: true,
  })
  fechaCierre: Date | null;

  @CreateDateColumn({
    name: 'fecha_creacion',
    type: 'datetime',
  })
  fechaCreacion: Date;

  @UpdateDateColumn({
    name: 'fecha_actualizacion',
    type: 'datetime',
  })
  fechaActualizacion: Date;
}
