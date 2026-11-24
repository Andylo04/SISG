
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('municipio')
export class Municipio {
  @PrimaryGeneratedColumn({ name: 'municipio_id' })
  municipioId: number;

  @Column({ name: 'departamento_id', type: 'int' })
  departamentoId: number;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({
    name: 'codigo_ine',
    type: 'varchar',
    length: 6,
    nullable: true,
    unique: true,
  })
  codigoIne: string | null;
}
