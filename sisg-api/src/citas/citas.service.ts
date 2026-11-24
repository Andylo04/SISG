
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Cita } from './entities/cita.entity.js';
import { Paciente } from '../pacientes/entities/paciente.entity.js';
import { Medico } from '../medicos/entities/medico.entity.js';
import { Hospital } from '../hospitales/entities/hospital.entity.js';

type RolNombre = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(Cita)
    private readonly citaRepository: Repository<Cita>,

    @InjectRepository(Paciente)
    private readonly pacienteRepository: Repository<Paciente>,

    @InjectRepository(Medico)
    private readonly medicoRepository: Repository<Medico>,

    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
  ) {}

  // FILTRAR CITAS SEGÚN EL USUARIO AUTENTICADO
  private aplicarAlcance(
    query: SelectQueryBuilder<Cita>,
    usuario: UsuarioAutenticado,
  ) {
    if (usuario.rol === 'MEDICO') {
      if (!usuario.medicoId) {
        throw new ForbiddenException(
          'La cuenta médica no tiene un médico asociado.',
        );
      }

      query.andWhere('cita.medicoId = :medicoId', {
        medicoId: Number(usuario.medicoId),
      });
    }

    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta del hospital no tiene una institución asociada.',
        );
      }

      query.andWhere('cita.hospitalId = :hospitalId', {
        hospitalId: Number(usuario.hospitalId),
      });
    }

    return query;
  }

  // VALIDAR RELACIONES
  private async validarRelaciones(
    pacienteId: number,
    medicoId: number,
    hospitalId: number,
  ) {
    const [paciente, medico, hospital] = await Promise.all([
      this.pacienteRepository.findOne({
        where: { pacienteId },
      }),
      this.medicoRepository.findOne({
        where: { medicoId },
      }),
      this.hospitalRepository.findOne({
        where: { hospitalId },
      }),
    ]);

    if (!paciente) {
      throw new BadRequestException(
        `No existe el paciente ${pacienteId}.`,
      );
    }

    if (!medico) {
      throw new BadRequestException(
        `No existe el médico ${medicoId}.`,
      );
    }

    if (!hospital) {
      throw new BadRequestException(
        `No existe el hospital ${hospitalId}.`,
      );
    }
  }

  // LISTAR CITAS
  async findAll(
    busqueda?: string,
    estado?: string,
    usuario?: UsuarioAutenticado,
  ) {
    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const query = this.citaRepository
      .createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.medico', 'medico')
      .leftJoinAndSelect('cita.hospital', 'hospital')
      .orderBy('cita.fechaHoraProgramada', 'DESC');

    this.aplicarAlcance(query, usuario);

    if (busqueda?.trim()) {
      const termino = `%${busqueda.trim()}%`;

      query.andWhere(
        `(
          CAST(cita.citaId AS CHAR) LIKE :termino
          OR CAST(cita.pacienteId AS CHAR) LIKE :termino
          OR CAST(cita.medicoId AS CHAR) LIKE :termino
          OR hospital.nombre LIKE :termino
        )`,
        { termino },
      );
    }

    if (estado?.trim()) {
      query.andWhere('cita.estado = :estado', {
        estado: estado.trim(),
      });
    }

    return query.getMany();
  }

  // CONSULTAR UNA CITA
  async findOne(
    id: number,
    usuario?: UsuarioAutenticado,
  ) {
    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const query = this.citaRepository
      .createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.medico', 'medico')
      .leftJoinAndSelect('cita.hospital', 'hospital')
      .where('cita.citaId = :id', { id });

    this.aplicarAlcance(query, usuario);

    const cita = await query.getOne();

    if (!cita) {
      throw new NotFoundException(
        `No se encontró la cita ${id}.`,
      );
    }

    return cita;
  }

  // REGISTRAR CITA
  async create(
    data: {
      pacienteId: number;
      medicoId: number;
      hospitalId: number;
      fechaHoraProgramada: string;
      estado?: string;
    },
    usuario: UsuarioAutenticado,
  ) {
    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const pacienteId = Number(data.pacienteId);
    const medicoId = Number(data.medicoId);
    const hospitalId = Number(data.hospitalId);

    if (
      !Number.isInteger(pacienteId) || pacienteId <= 0 ||
      !Number.isInteger(medicoId) || medicoId <= 0 ||
      !Number.isInteger(hospitalId) || hospitalId <= 0
    ) {
      throw new BadRequestException(
        'Selecciona un paciente, médico y hospital válidos.',
      );
    }

    if (
      usuario.rol === 'HOSPITAL' &&
      hospitalId !== Number(usuario.hospitalId)
    ) {
      throw new ForbiddenException(
        'No puedes registrar citas para otro hospital.',
      );
    }

    if (!data.fechaHoraProgramada) {
      throw new BadRequestException(
        'La fecha y hora son obligatorias.',
      );
    }

    const fecha = new Date(data.fechaHoraProgramada);

    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException(
        'La fecha de la cita no es válida.',
      );
    }

    const estado = data.estado?.trim() || 'Pendiente';

    if (estado.length > 20) {
      throw new BadRequestException(
        'El estado no puede superar los 20 caracteres.',
      );
    }

    await this.validarRelaciones(
      pacienteId,
      medicoId,
      hospitalId,
    );

    const nuevaCita = this.citaRepository.create({
      pacienteId,
      medicoId,
      hospitalId,
      fechaHoraProgramada: fecha,
      estado,
    });

    // GUARDAR EN MYSQL
    const guardada = await this.citaRepository.save(nuevaCita);

    console.log('CITA GUARDADA:', {
      citaId: guardada.citaId,
      medicoId: guardada.medicoId,
      pacienteId: guardada.pacienteId,
      hospitalId: guardada.hospitalId,
    });

    // RECUPERAR EL REGISTRO CON SUS RELACIONES
    const resultado = await this.citaRepository.findOne({
      where: {
        citaId: guardada.citaId,
      },
      relations: {
        paciente: true,
        medico: true,
        hospital: true,
      },
    });

    if (!resultado) {
      throw new NotFoundException(
        'La cita se guardó, pero no fue posible recuperarla.',
      );
    }

    return resultado;
  }

  // ACTUALIZAR CITA
  async update(
    id: number,
    data: {
      pacienteId?: number;
      medicoId?: number;
      hospitalId?: number;
      fechaHoraProgramada?: string;
      estado?: string | null;
    },
    usuario: UsuarioAutenticado,
  ) {
    const cita = await this.findOne(id, usuario);

    const pacienteId = Number(data.pacienteId ?? cita.pacienteId);
    const medicoId = Number(data.medicoId ?? cita.medicoId);
    const hospitalId = Number(data.hospitalId ?? cita.hospitalId);

    if (
      usuario.rol === 'HOSPITAL' &&
      hospitalId !== Number(usuario.hospitalId)
    ) {
      throw new ForbiddenException(
        'No puedes trasladar citas a otro hospital.',
      );
    }

    await this.validarRelaciones(
      pacienteId,
      medicoId,
      hospitalId,
    );

    if (data.fechaHoraProgramada !== undefined) {
      const fecha = new Date(data.fechaHoraProgramada);

      if (Number.isNaN(fecha.getTime())) {
        throw new BadRequestException(
          'La fecha de la cita no es válida.',
        );
      }

      cita.fechaHoraProgramada = fecha;
    }

    if (data.estado !== undefined) {
      if (data.estado !== null && data.estado.length > 20) {
        throw new BadRequestException(
          'El estado no puede superar los 20 caracteres.',
        );
      }

      cita.estado = data.estado?.trim() || null;
    }

    cita.pacienteId = pacienteId;
    cita.medicoId = medicoId;
    cita.hospitalId = hospitalId;

    await this.citaRepository.save(cita);

    return this.findOne(id, usuario);
  }

  // CANCELAR CITA
  async cancelar(
    id: number,
    usuario: UsuarioAutenticado,
  ) {
    const cita = await this.findOne(id, usuario);

    cita.estado = 'Cancelada';

    await this.citaRepository.save(cita);

    return this.findOne(id, usuario);
  }
}
