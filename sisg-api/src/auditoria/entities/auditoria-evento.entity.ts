
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auditoria_evento')
@Index('idx_auditoria_fecha', ['fechaEvento'])
@Index('idx_auditoria_modulo', ['modulo'])
export class AuditoriaEvento {
  @PrimaryGeneratedColumn({ name: 'evento_id' })
  eventoId: number;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @Column({
    name: 'usuario_nombre',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  usuarioNombre: string | null;

  @Column({
    name: 'usuario_rol',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  usuarioRol: string | null;

  @Column({
    name: 'hospital_id',
    type: 'int',
    nullable: true,
  })
  hospitalId: number | null;

  @Column({ type: 'varchar', length: 60 })
  modulo: string;

  @Column({ type: 'varchar', length: 30 })
  accion: string;

  @Column({ type: 'varchar', length: 80 })
  entidad: string;

  @Column({
    name: 'entidad_id',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  entidadId: string | null;

  @Column({
    name: 'metodo_http',
    type: 'varchar',
    length: 10,
  })
  metodoHttp: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  endpoint: string;

  @Column({
    name: 'codigo_respuesta',
    type: 'int',
  })
  codigoRespuesta: number;

  @Column({
    name: 'direccion_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  direccionIp: string | null;

  @Column({
    name: 'datos_anteriores',
    type: 'json',
    nullable: true,
  })
  datosAnteriores: Record<string, any> | null;

  @Column({
    name: 'datos_nuevos',
    type: 'json',
    nullable: true,
  })
  datosNuevos: Record<string, any> | null;

  @CreateDateColumn({
    name: 'fecha_evento',
    type: 'datetime',
  })
  fechaEvento: Date;
}
