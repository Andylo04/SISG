
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { createHash } from 'crypto';

import { Paciente } from './entities/paciente.entity.js';
import { Municipio } from '../municipios/entities/municipio.entity.js';

type RolNombre = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class PacientesService {
  constructor(
    @InjectRepository(Paciente)
    private readonly pacienteRepository: Repository<Paciente>,

    @InjectRepository(Municipio)
    private readonly municipioRepository: Repository<Municipio>,
  ) {}

  // Generar hash SHA-256 del DPI
  private generarHash(dpi: string): string {
    return createHash('sha256')
      .update(dpi.trim())
      .digest('hex');
  }

  // Aplicar permisos de acceso a los pacientes
  private aplicarAlcance(
    query: SelectQueryBuilder<Paciente>,
    usuario: UsuarioAutenticado,
  ) {
    if (usuario.rol === 'MEDICO') {
      if (!usuario.medicoId) {
        throw new ForbiddenException(
          'La cuenta médica no tiene un médico asociado.',
        );
      }

      query.andWhere(
        `(
          EXISTS (
            SELECT 1
            FROM cita c
            WHERE c.paciente_id = paciente.paciente_id
              AND c.medico_id = :medicoId
          )
          OR EXISTS (
            SELECT 1
            FROM consulta co
            WHERE co.paciente_id = paciente.paciente_id
              AND co.medico_id = :medicoId
          )
        )`,
        { medicoId: usuario.medicoId },
      );
    }

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
            WHERE c.paciente_id = paciente.paciente_id
              AND c.hospital_id = :hospitalId
          )
          OR EXISTS (
            SELECT 1
            FROM consulta co
            WHERE co.paciente_id = paciente.paciente_id
              AND co.hospital_id = :hospitalId
          )
          OR EXISTS (
            SELECT 1
            FROM hospitalizacion h
            WHERE h.paciente_id = paciente.paciente_id
              AND h.hospital_id = :hospitalId
          )
        )`,
        { hospitalId: usuario.hospitalId },
      );
    }

    return query;
  }

  // Validar datos del paciente
  private async validarDatos(data: {
    sexo?: string | null;
    fechaNacimiento?: string | null;
    municipioId?: number | null;
  }) {
    if (
      data.sexo !== undefined &&
      data.sexo !== null &&
      !['M', 'F', 'Otro'].includes(data.sexo)
    ) {
      throw new BadRequestException(
        'El sexo debe ser M, F u Otro.',
      );
    }

    if (data.fechaNacimiento) {
      const fecha = new Date(`${data.fechaNacimiento}T00:00:00`);

      if (
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== data.fechaNacimiento
      ) {
        throw new BadRequestException(
          'La fecha de nacimiento no es válida.',
        );
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fecha > hoy) {
        throw new BadRequestException(
          'La fecha de nacimiento no puede ser futura.',
        );
      }
    }

    if (
      data.municipioId !== undefined &&
      data.municipioId !== null
    ) {
      const municipio = await this.municipioRepository.findOne({
        where: { municipioId: data.municipioId },
      });

      if (!municipio) {
        throw new BadRequestException(
          'El municipio seleccionado no existe.',
        );
      }
    }
  }

  // Evitar exponer el hash del DPI en las respuestas
  private presentarPaciente(paciente: Paciente) {
    const { dpiHash, ...datos } = paciente;
    return datos;
  }

  // Consultar pacientes según el rol
  async findAll(
    busqueda: string | undefined,
    usuario: UsuarioAutenticado,
  ) {
    const query = this.pacienteRepository
      .createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.municipio', 'municipio')
      .orderBy('paciente.pacienteId', 'ASC');

    this.aplicarAlcance(query, usuario);

    if (busqueda?.trim()) {
      const termino = busqueda.trim();

      query.andWhere(
        `(CAST(paciente.pacienteId AS CHAR) LIKE :termino
          OR municipio.nombre LIKE :termino)`,
        { termino: `%${termino}%` },
      );
    }

    const pacientes = await query.getMany();

    return pacientes.map((paciente) =>
      this.presentarPaciente(paciente),
    );
  }

  // Consultar un paciente verificando los permisos
  async findOne(
    id: number,
    usuario: UsuarioAutenticado,
  ) {
    const query = this.pacienteRepository
      .createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.municipio', 'municipio')
      .where('paciente.pacienteId = :id', { id });

    this.aplicarAlcance(query, usuario);

    const paciente = await query.getOne();

    if (!paciente) {
      throw new NotFoundException(
        `No se encontró el paciente con ID ${id}.`,
      );
    }

    return this.presentarPaciente(paciente);
  }

  // Registrar paciente
  async create(data: {
    dpi: string;
    sexo?: string;
    fechaNacimiento?: string;
    municipioId?: number;
  }) {
    if (!data.dpi || !/^\d{13}$/.test(data.dpi.trim())) {
      throw new BadRequestException(
        'El DPI debe contener exactamente 13 dígitos.',
      );
    }

    await this.validarDatos(data);

    const dpiHash = this.generarHash(data.dpi);

    const existente = await this.pacienteRepository.findOne({
      where: { dpiHash },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe un paciente registrado con ese DPI.',
      );
    }

    const paciente = this.pacienteRepository.create({
      dpiHash,
      sexo: data.sexo ?? null,
      fechaNacimiento: data.fechaNacimiento ?? null,
      municipioId: data.municipioId ?? null,
      fechaRegistro: new Date().toISOString().slice(0, 10),
    });

    const guardado = await this.pacienteRepository.save(paciente);

    const resultado = await this.pacienteRepository.findOne({
      where: { pacienteId: guardado.pacienteId },
      relations: { municipio: true },
    });

    if (!resultado) {
      throw new NotFoundException(
        'No se pudo recuperar el paciente registrado.',
      );
    }

    return this.presentarPaciente(resultado);
  }

  // Actualizar información del paciente
  async update(
    id: number,
    data: {
      sexo?: string | null;
      fechaNacimiento?: string | null;
      municipioId?: number | null;
    },
  ) {
    const paciente = await this.pacienteRepository.findOne({
      where: { pacienteId: id },
    });

    if (!paciente) {
      throw new NotFoundException(
        `No se encontró el paciente con ID ${id}.`,
      );
    }

    await this.validarDatos(data);

    if (data.sexo !== undefined) {
      paciente.sexo = data.sexo;
    }

    if (data.fechaNacimiento !== undefined) {
      paciente.fechaNacimiento = data.fechaNacimiento;
    }

    if (data.municipioId !== undefined) {
      paciente.municipioId = data.municipioId;
    }

    await this.pacienteRepository.save(paciente);

    const resultado = await this.pacienteRepository.findOne({
      where: { pacienteId: id },
      relations: { municipio: true },
    });

    if (!resultado) {
      throw new NotFoundException(
        `No se encontró el paciente con ID ${id}.`,
      );
    }

    return this.presentarPaciente(resultado);
  }
}
