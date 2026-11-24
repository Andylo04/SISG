
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';

import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn()
  rol_id!: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  activo!: number;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios!: Usuario[];
}
