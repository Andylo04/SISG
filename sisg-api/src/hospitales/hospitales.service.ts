
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { Hospital } from './entities/hospital.entity.js';
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
export class HospitalesService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,

    @InjectRepository(Municipio)
    private readonly municipioRepository: Repository<Municipio>,
  ) {}

  // Validar que el hospital pertenezca al usuario
  private validarAcceso(
    hospitalId: number,
    usuario: UsuarioAutenticado,
  ) {
    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta no tiene un hospital asociado.',
        );
      }

      if (hospitalId !== usuario.hospitalId) {
        throw new NotFoundException(
          'No se encontró el hospital solicitado.',
        );
      }
    }
  }

  // Validar y limpiar los datos recibidos
  private async validarDatos(data: Partial<Hospital>) {
    if (
      data.codigoEstablecimiento !== undefined &&
      !/^[A-Za-z0-9-]{2,20}$/.test(data.codigoEstablecimiento.trim())
    ) {
      throw new BadRequestException(
        'El código debe tener entre 2 y 20 caracteres alfanuméricos o guiones.',
      );
    }

    if (
      data.nombre !== undefined &&
      data.nombre.trim().length < 3
    ) {
      throw new BadRequestException(
        'El nombre debe tener al menos 3 caracteres.',
      );
    }

    if (
      data.nit &&
      !/^[0-9-]{5,15}$/.test(data.nit.trim())
    ) {
      throw new BadRequestException(
        'El NIT no tiene un formato válido.',
      );
    }

    if (
      data.numCamas !== undefined &&
      data.numCamas !== null &&
      (!Number.isInteger(Number(data.numCamas)) ||
        Number(data.numCamas) < 0)
    ) {
      throw new BadRequestException(
        'El número de camas debe ser un entero igual o mayor que cero.',
      );
    }

    if (
      data.telefono &&
      !/^[0-9+\- ]{7,20}$/.test(data.telefono.trim())
    ) {
      throw new BadRequestException(
        'El teléfono debe contener entre 7 y 20 caracteres válidos.',
      );
    }

    if (
      data.direccion !== undefined &&
      data.direccion !== null &&
      data.direccion.length > 200
    ) {
      throw new BadRequestException(
        'La dirección no puede superar los 200 caracteres.',
      );
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

  // Consultar hospitales según el rol
  async findAll(
    busqueda?: string,
    estado?: string,
    usuario?: UsuarioAutenticado,
  ) {
    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const query = this.hospitalRepository
      .createQueryBuilder('hospital')
      .leftJoinAndSelect('hospital.municipio', 'municipio')
      .orderBy('hospital.hospitalId', 'ASC');

    // El hospital solo puede consultar su propia institución.
    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta no tiene un hospital asociado.',
        );
      }

      query.andWhere('hospital.hospitalId = :hospitalId', {
        hospitalId: usuario.hospitalId,
      });
    }

    if (busqueda?.trim()) {
      query.andWhere(
        `(hospital.nombre LIKE :busqueda
          OR hospital.codigoEstablecimiento LIKE :busqueda
          OR hospital.nit LIKE :busqueda)`,
        { busqueda: `%${busqueda.trim()}%` },
      );
    }

    if (estado === 'activo') {
      query.andWhere('hospital.activo = :activo', {
        activo: true,
      });
    } else if (estado === 'inactivo') {
      query.andWhere('hospital.activo = :activo', {
        activo: false,
      });
    }

    return query.getMany();
  }

  // Consultar un hospital por ID
  async findOne(
    id: number,
    usuario: UsuarioAutenticado,
  ) {
    const hospital = await this.hospitalRepository.findOne({
      where: { hospitalId: id },
      relations: { municipio: true },
    });

    if (!hospital) {
      throw new NotFoundException(
        `No se encontró el hospital con ID ${id}.`,
      );
    }

    this.validarAcceso(hospital.hospitalId, usuario);

    return hospital;
  }

  // Registrar hospital
  async create(data: Partial<Hospital>) {
    if (!data.codigoEstablecimiento?.trim()) {
      throw new BadRequestException(
        'El código de establecimiento es obligatorio.',
      );
    }

    if (!data.nombre?.trim()) {
      throw new BadRequestException(
        'El nombre del hospital es obligatorio.',
      );
    }

    await this.validarDatos(data);

    const codigo = data.codigoEstablecimiento.trim();

    const existente = await this.hospitalRepository.findOne({
      where: { codigoEstablecimiento: codigo },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe un hospital con ese código de establecimiento.',
      );
    }

    const hospital = this.hospitalRepository.create({
      ...data,
      codigoEstablecimiento: codigo,
      nombre: data.nombre.trim(),
      nit: data.nit?.trim() || null,
      telefono: data.telefono?.trim() || null,
      direccion: data.direccion?.trim() || null,
    });

    return this.hospitalRepository.save(hospital);
  }

  // Actualizar hospital
  async update(id: number, data: Partial<Hospital>) {
    const hospital = await this.hospitalRepository.findOne({
      where: { hospitalId: id },
    });

    if (!hospital) {
      throw new NotFoundException(
        `No se encontró el hospital con ID ${id}.`,
      );
    }

    await this.validarDatos(data);

    if (
      data.codigoEstablecimiento !== undefined &&
      data.codigoEstablecimiento.trim() !== hospital.codigoEstablecimiento
    ) {
      const existente = await this.hospitalRepository.findOne({
        where: {
          codigoEstablecimiento: data.codigoEstablecimiento.trim(),
          hospitalId: Not(id),
        },
      });

      if (existente) {
        throw new ConflictException(
          'Ese código de establecimiento ya está registrado.',
        );
      }
    }

    const datosActualizados = {
      ...data,
      ...(data.codigoEstablecimiento !== undefined
        ? { codigoEstablecimiento: data.codigoEstablecimiento.trim() }
        : {}),
      ...(data.nombre !== undefined
        ? { nombre: data.nombre.trim() }
        : {}),
      ...(data.nit !== undefined
        ? { nit: data.nit?.trim() || null }
        : {}),
      ...(data.telefono !== undefined
        ? { telefono: data.telefono?.trim() || null }
        : {}),
      ...(data.direccion !== undefined
        ? { direccion: data.direccion?.trim() || null }
        : {}),
    };

    Object.assign(hospital, datosActualizados);

    return this.hospitalRepository.save(hospital);
  }

  // Desactivar hospital sin eliminarlo
  async remove(id: number) {
    const hospital = await this.hospitalRepository.findOne({
      where: { hospitalId: id },
    });

    if (!hospital) {
      throw new NotFoundException(
        `No se encontró el hospital con ID ${id}.`,
      );
    }

    if (!hospital.activo) {
      throw new BadRequestException(
        'El hospital ya está desactivado.',
      );
    }

    hospital.activo = false;

    return this.hospitalRepository.save(hospital);
  }

  // Reactivar hospital
  async activate(id: number) {
    const hospital = await this.hospitalRepository.findOne({
      where: { hospitalId: id },
    });

    if (!hospital) {
      throw new NotFoundException(
        `No se encontró el hospital con ID ${id}.`,
      );
    }

    if (hospital.activo) {
      throw new BadRequestException(
        'El hospital ya está activo.',
      );
    }

    hospital.activo = true;

    return this.hospitalRepository.save(hospital);
  }
}
