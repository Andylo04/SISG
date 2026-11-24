
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Rol } from '../../roles/entities/rol.entity.js';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  usuario_id!: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'int' })
  rol_id!: number;

  @Column({ type: 'int', nullable: true, unique: true })
  medico_id!: number | null;

  @Column({ type: 'int', nullable: true, unique: true })
  hospital_id!: number | null;

  @Column({ type: 'tinyint', default: 1 })
  activo!: number;

  @Column({ type: 'tinyint', default: 1 })
  debe_cambiar_password!: number;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion!: Date;

  @Column({ type: 'datetime', nullable: true })
  ultimo_acceso!: Date | null;

  @ManyToOne(() => Rol, (rol) => rol.usuarios)
  @JoinColumn({
    name: 'rol_id',
    referencedColumnName: 'rol_id',
  })
  rol!: Rol;
}
