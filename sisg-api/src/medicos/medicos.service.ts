
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Medico } from './entities/medico.entity.js';

type RolNombre = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class MedicosService {
  constructor(
    @InjectRepository(Medico)
    private readonly medicoRepository: Repository<Medico>,
  ) {}

  // ==========================================
  // APLICAR RESTRICCIONES SEGÚN EL USUARIO
  // ==========================================

  private aplicarAlcance(
    query: SelectQueryBuilder<Medico>,
    usuario: UsuarioAutenticado,
  ) {
    // MÉDICO: solamente puede consultar su propio registro.
    if (usuario.rol === 'MEDICO') {
      if (!usuario.medicoId) {
        throw new ForbiddenException(
          'La cuenta médica no tiene un médico asociado.',
        );
      }

      query.andWhere('medico.medicoId = :medicoId', {
        medicoId: usuario.medicoId,
      });
    }

    // HOSPITAL: solamente médicos con actividad
    // registrada en sus citas u hospitalizaciones.
    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta del hospital no tiene una institución asociada.',
        );
      }

      query.andWhere(
        `(
          EXISTS (
            SELECT 1
            FROM cita c
            WHERE c.medico_id = medico.medico_id
              AND c.hospital_id = :hospitalId
          )
          OR
          EXISTS (
            SELECT 1
            FROM hospitalizacion h
            WHERE h.medico_id = medico.medico_id
              AND h.hospital_id = :hospitalId
          )
        )`,
        {
          hospitalId: usuario.hospitalId,
        },
      );
    }

    // ADMINISTRADOR: puede consultar todos los médicos.
    return query;
  }

  // ==========================================
  // LISTAR MÉDICOS
  // ==========================================

  async findAll(
    usuario: UsuarioAutenticado,
  ): Promise<Medico[]> {
    if (!usuario) {
      throw new ForbiddenException(
        'Usuario no autenticado.',
      );
    }

    const query = this.medicoRepository
      .createQueryBuilder('medico')
      .leftJoinAndSelect(
        'medico.especialidad',
        'especialidad',
      )
      .orderBy('medico.medicoId', 'ASC');

    this.aplicarAlcance(query, usuario);

    return query.getMany();
  }

  // ==========================================
  // CONSULTAR MÉDICO POR ID
  // ==========================================

  async findOne(
    id: number,
    usuario: UsuarioAutenticado,
  ): Promise<Medico> {
    if (!usuario) {
      throw new ForbiddenException(
        'Usuario no autenticado.',
      );
    }

    const query = this.medicoRepository
      .createQueryBuilder('medico')
      .leftJoinAndSelect(
        'medico.especialidad',
        'especialidad',
      )
      .where('medico.medicoId = :id', { id });

    this.aplicarAlcance(query, usuario);

    const medico = await query.getOne();

    if (!medico) {
      throw new NotFoundException(
        `No se encontró el médico con ID ${id}.`,
      );
    }

    return medico;
  }

  // ==========================================
  // REGISTRAR MÉDICO
  // ==========================================

  async create(
    datos: Partial<Medico>,
  ): Promise<Medico> {
    const nuevoMedico =
      this.medicoRepository.create(datos);

    const guardado =
      await this.medicoRepository.save(nuevoMedico);

    return this.findOneComoAdministrador(
      guardado.medicoId,
    );
  }

  // ==========================================
  // ACTUALIZAR MÉDICO
  // ==========================================

  async update(
    id: number,
    datos: Partial<Medico>,
  ): Promise<Medico> {
    const medico = await this.medicoRepository.findOne({
      where: { medicoId: id },
      relations: {
        especialidad: true,
      },
    });

    if (!medico) {
      throw new NotFoundException(
        `No se encontró el médico con ID ${id}.`,
      );
    }

    const medicoActualizado =
      this.medicoRepository.merge(medico, datos);

    await this.medicoRepository.save(medicoActualizado);

    return this.findOneComoAdministrador(id);
  }

  // ==========================================
  // CONSULTA INTERNA ADMINISTRATIVA
  // ==========================================

  private async findOneComoAdministrador(
    id: number,
  ): Promise<Medico> {
    const medico = await this.medicoRepository.findOne({
      where: { medicoId: id },
      relations: {
        especialidad: true,
      },
    });

    if (!medico) {
      throw new NotFoundException(
        `No se encontró el médico con ID ${id}.`,
      );
    }

    return medico;
  }

  // ==========================================
  // DESACTIVAR MÉDICO
  // ==========================================

  async remove(
    id: number,
  ): Promise<{ message: string }> {
    const medico =
      await this.findOneComoAdministrador(id);

    medico.activo = false;

    await this.medicoRepository.save(medico);

    return {
      message: `El médico ${id} fue desactivado correctamente.`,
    };
  }
}
