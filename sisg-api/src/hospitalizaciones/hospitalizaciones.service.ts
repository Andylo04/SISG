
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { Hospitalizacion } from './entities/hospitalizacion.entity.js';
import { Paciente } from '../pacientes/entities/paciente.entity.js';
import { Medico } from '../medicos/entities/medico.entity.js';
import { Hospital } from '../hospitales/entities/hospital.entity.js';

type UsuarioAutenticado = {
  usuarioId: number;
  email: string;
  rol: 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';
  medicoId: number | null;
  hospitalId: number | null;
};

@Injectable()
export class HospitalizacionesService {
  constructor(
    @InjectRepository(Hospitalizacion)
    private readonly hospitalizacionRepository: Repository<Hospitalizacion>,

    @InjectRepository(Paciente)
    private readonly pacienteRepository: Repository<Paciente>,

    @InjectRepository(Medico)
    private readonly medicoRepository: Repository<Medico>,

    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
  ) {}

  // ==========================================
  // VALIDAR USUARIO AUTENTICADO
  // ==========================================

  private validarUsuario(usuario: UsuarioAutenticado) {
    if (!usuario || !usuario.rol) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    if (
      usuario.rol !== 'ADMINISTRADOR' &&
      usuario.rol !== 'MEDICO' &&
      usuario.rol !== 'HOSPITAL'
    ) {
      throw new ForbiddenException('Rol no autorizado.');
    }
  }

  // ==========================================
  // APLICAR FILTROS SEGÚN EL ROL
  // ==========================================

  private aplicarFiltroUsuario(
    query: SelectQueryBuilder<Hospitalizacion>,
    usuario: UsuarioAutenticado,
  ) {
    this.validarUsuario(usuario);

    if (usuario.rol === 'MEDICO') {
      const medicoId = Number(usuario.medicoId);

      if (!Number.isInteger(medicoId) || medicoId <= 0) {
        throw new ForbiddenException(
          'La cuenta médica no tiene un médico asociado.',
        );
      }

      query.andWhere(
        'hospitalizacion.medicoId = :medicoId',
        { medicoId },
      );
    }

    if (usuario.rol === 'HOSPITAL') {
      const hospitalId = Number(usuario.hospitalId);

      if (!Number.isInteger(hospitalId) || hospitalId <= 0) {
        throw new ForbiddenException(
          'La cuenta hospitalaria no tiene una institución asociada.',
        );
      }

      query.andWhere(
        'hospitalizacion.hospitalId = :hospitalId',
        { hospitalId },
      );
    }

    return query;
  }

  // ==========================================
  // VALIDAR HOSPITAL DEL USUARIO
  // ==========================================

  private validarHospitalUsuario(
    hospitalId: number,
    usuario: UsuarioAutenticado,
  ) {
    this.validarUsuario(usuario);

    if (usuario.rol === 'HOSPITAL') {
      if (
        Number(hospitalId) !== Number(usuario.hospitalId)
      ) {
        throw new ForbiddenException(
          'No tienes autorización para operar en otro hospital.',
        );
      }
    }
  }

  // ==========================================
  // FORMATEAR RESPUESTA
  // NO EXPONER INFORMACIÓN SENSIBLE DEL PACIENTE
  // ==========================================

  private formatearRespuesta(registro: Hospitalizacion) {
    return {
      ...registro,
      paciente: registro.paciente
        ? {
            pacienteId: registro.paciente.pacienteId,
            sexo: registro.paciente.sexo,
            fechaNacimiento: registro.paciente.fechaNacimiento,
            municipioId: registro.paciente.municipioId,
            fechaRegistro: registro.paciente.fechaRegistro,
          }
        : null,
    };
  }

  // ==========================================
  // LISTAR HOSPITALIZACIONES
  // ==========================================

  async findAll(
    busqueda: string | undefined,
    estado: string | undefined,
    usuario: UsuarioAutenticado,
  ) {
    this.validarUsuario(usuario);

    const query = this.hospitalizacionRepository
      .createQueryBuilder('hospitalizacion')
      .leftJoinAndSelect('hospitalizacion.paciente', 'paciente')
      .leftJoinAndSelect('hospitalizacion.medico', 'medico')
      .leftJoinAndSelect('hospitalizacion.hospital', 'hospital')
      .orderBy('hospitalizacion.fechaIngreso', 'DESC');

    this.aplicarFiltroUsuario(query, usuario);

    if (busqueda?.trim()) {
      const termino = `%${busqueda.trim()}%`;

      query.andWhere(
        `(
          CAST(hospitalizacion.hospitalizacionId AS CHAR) LIKE :termino
          OR CAST(hospitalizacion.pacienteId AS CHAR) LIKE :termino
          OR CAST(hospitalizacion.medicoId AS CHAR) LIKE :termino
          OR hospitalizacion.cie10Ingreso LIKE :termino
          OR hospitalizacion.codigoAseguradora LIKE :termino
          OR medico.nombres LIKE :termino
          OR medico.apellidos LIKE :termino
          OR hospital.nombre LIKE :termino
        )`,
        { termino },
      );
    }

    if (estado === 'activa') {
      query.andWhere(
        'hospitalizacion.fechaEgreso IS NULL',
      );
    }

    if (estado === 'egresada') {
      query.andWhere(
        'hospitalizacion.fechaEgreso IS NOT NULL',
      );
    }

    const registros = await query.getMany();

    return registros.map((registro) =>
      this.formatearRespuesta(registro),
    );
  }

  // ==========================================
  // CONSULTAR UNA HOSPITALIZACIÓN
  // ==========================================

  async findOne(
    id: number,
    usuario: UsuarioAutenticado,
  ) {
    const query = this.hospitalizacionRepository
      .createQueryBuilder('hospitalizacion')
      .leftJoinAndSelect('hospitalizacion.paciente', 'paciente')
      .leftJoinAndSelect('hospitalizacion.medico', 'medico')
      .leftJoinAndSelect('hospitalizacion.hospital', 'hospital')
      .where(
        'hospitalizacion.hospitalizacionId = :id',
        { id },
      );

    this.aplicarFiltroUsuario(query, usuario);

    const registro = await query.getOne();

    if (!registro) {
      throw new NotFoundException(
        `No se encontró la hospitalización ${id}.`,
      );
    }

    return this.formatearRespuesta(registro);
  }

  // ==========================================
  // VALIDAR RELACIONES
  // ==========================================

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
        'El paciente seleccionado no existe.',
      );
    }

    if (!medico) {
      throw new BadRequestException(
        'El médico seleccionado no existe.',
      );
    }

    if (!hospital) {
      throw new BadRequestException(
        'El hospital seleccionado no existe.',
      );
    }

    if (!medico.activo) {
      throw new BadRequestException(
        'El médico seleccionado está inactivo.',
      );
    }

    if (!hospital.activo) {
      throw new BadRequestException(
        'El hospital seleccionado está inactivo.',
      );
    }
  }

  // ==========================================
  // REGISTRAR INGRESO
  // ==========================================

  async create(
    data: {
      pacienteId: number;
      medicoId: number;
      hospitalId: number;
      cie10Ingreso?: string;
      fechaIngreso: string;
      montoFacturado?: number | null;
      codigoAseguradora?: string | null;
    },
    usuario: UsuarioAutenticado,
  ) {
    this.validarUsuario(usuario);

    const pacienteId = Number(data.pacienteId);
    const medicoId = Number(data.medicoId);
    const hospitalId = Number(data.hospitalId);

    if (
      !Number.isInteger(pacienteId) ||
      pacienteId <= 0 ||
      !Number.isInteger(medicoId) ||
      medicoId <= 0 ||
      !Number.isInteger(hospitalId) ||
      hospitalId <= 0
    ) {
      throw new BadRequestException(
        'Selecciona un paciente, médico y hospital válidos.',
      );
    }

    this.validarHospitalUsuario(hospitalId, usuario);

    if (!data.fechaIngreso) {
      throw new BadRequestException(
        'La fecha de ingreso es obligatoria.',
      );
    }

    const fechaIngreso = new Date(data.fechaIngreso);

    if (Number.isNaN(fechaIngreso.getTime())) {
      throw new BadRequestException(
        'La fecha de ingreso no es válida.',
      );
    }

    if (
      data.montoFacturado !== undefined &&
      data.montoFacturado !== null &&
      (
        !Number.isFinite(Number(data.montoFacturado)) ||
        Number(data.montoFacturado) < 0
      )
    ) {
      throw new BadRequestException(
        'El monto facturado no es válido.',
      );
    }

    await this.validarRelaciones(
      pacienteId,
      medicoId,
      hospitalId,
    );

    const hospitalizacion =
      this.hospitalizacionRepository.create({
        pacienteId,
        medicoId,
        hospitalId,
        cie10Ingreso: data.cie10Ingreso?.trim() || null,
        fechaIngreso,
        fechaEgreso: null,
        tipoEgreso: null,
        montoFacturado:
          data.montoFacturado == null
            ? null
            : String(data.montoFacturado),
        codigoAseguradora:
          data.codigoAseguradora?.trim() || null,
      });

    const guardado =
      await this.hospitalizacionRepository.save(
        hospitalizacion,
      );

    return this.findOne(
      guardado.hospitalizacionId,
      usuario,
    );
  }

  // ==========================================
  // ACTUALIZAR HOSPITALIZACIÓN
  // ==========================================

  async update(
    id: number,
    data: {
      pacienteId?: number;
      medicoId?: number;
      hospitalId?: number;
      cie10Ingreso?: string | null;
      fechaIngreso?: string;
      montoFacturado?: number | null;
      codigoAseguradora?: string | null;
    },
    usuario: UsuarioAutenticado,
  ) {
    const hospitalizacion = await this.hospitalizacionRepository.findOne({
      where: { hospitalizacionId: id },
    });

    if (!hospitalizacion) {
      throw new NotFoundException(
        'Hospitalización no encontrada.',
      );
    }

    this.validarHospitalUsuario(
      hospitalizacion.hospitalId,
      usuario,
    );

    const pacienteId = Number(
      data.pacienteId ?? hospitalizacion.pacienteId,
    );

    const medicoId = Number(
      data.medicoId ?? hospitalizacion.medicoId,
    );

    const hospitalId = Number(
      data.hospitalId ?? hospitalizacion.hospitalId,
    );

    this.validarHospitalUsuario(hospitalId, usuario);

    await this.validarRelaciones(
      pacienteId,
      medicoId,
      hospitalId,
    );

    const fechaIngreso = data.fechaIngreso
      ? new Date(data.fechaIngreso)
      : hospitalizacion.fechaIngreso;

    if (Number.isNaN(fechaIngreso.getTime())) {
      throw new BadRequestException(
        'La fecha de ingreso no es válida.',
      );
    }

    if (
      hospitalizacion.fechaEgreso &&
      hospitalizacion.fechaEgreso < fechaIngreso
    ) {
      throw new BadRequestException(
        'El ingreso no puede ser posterior al egreso registrado.',
      );
    }

    if (
      data.montoFacturado !== undefined &&
      data.montoFacturado !== null &&
      (
        !Number.isFinite(Number(data.montoFacturado)) ||
        Number(data.montoFacturado) < 0
      )
    ) {
      throw new BadRequestException(
        'El monto facturado no es válido.',
      );
    }

    hospitalizacion.pacienteId = pacienteId;
    hospitalizacion.medicoId = medicoId;
    hospitalizacion.hospitalId = hospitalId;
    hospitalizacion.fechaIngreso = fechaIngreso;

    if (data.cie10Ingreso !== undefined) {
      hospitalizacion.cie10Ingreso =
        data.cie10Ingreso?.trim() || null;
    }

    if (data.montoFacturado !== undefined) {
      hospitalizacion.montoFacturado =
        data.montoFacturado === null
          ? null
          : String(data.montoFacturado);
    }

    if (data.codigoAseguradora !== undefined) {
      hospitalizacion.codigoAseguradora =
        data.codigoAseguradora?.trim() || null;
    }

    await this.hospitalizacionRepository.save(
      hospitalizacion,
    );

    return this.findOne(id, usuario);
  }

  // ==========================================
  // REGISTRAR EGRESO
  // ==========================================

  async registrarEgreso(
    id: number,
    data: {
      fechaEgreso: string;
      tipoEgreso: string;
      montoFacturado?: number | null;
    },
    usuario: UsuarioAutenticado,
  ) {
    const hospitalizacion = await this.hospitalizacionRepository.findOne({
      where: { hospitalizacionId: id },
    });

    if (!hospitalizacion) {
      throw new NotFoundException(
        'Hospitalización no encontrada.',
      );
    }

    this.validarHospitalUsuario(
      hospitalizacion.hospitalId,
      usuario,
    );

    if (hospitalizacion.fechaEgreso) {
      throw new BadRequestException(
        'Esta hospitalización ya tiene un egreso registrado.',
      );
    }

    if (!data.fechaEgreso || !data.tipoEgreso?.trim()) {
      throw new BadRequestException(
        'La fecha y el tipo de egreso son obligatorios.',
      );
    }

    const fechaEgreso = new Date(data.fechaEgreso);

    if (
      Number.isNaN(fechaEgreso.getTime()) ||
      fechaEgreso < hospitalizacion.fechaIngreso
    ) {
      throw new BadRequestException(
        'La fecha de egreso no es válida o es anterior al ingreso.',
      );
    }

    if (
      data.montoFacturado !== undefined &&
      data.montoFacturado !== null &&
      (
        !Number.isFinite(Number(data.montoFacturado)) ||
        Number(data.montoFacturado) < 0
      )
    ) {
      throw new BadRequestException(
        'El monto facturado no es válido.',
      );
    }

    hospitalizacion.fechaEgreso = fechaEgreso;
    hospitalizacion.tipoEgreso = data.tipoEgreso.trim();

    if (data.montoFacturado !== undefined) {
      hospitalizacion.montoFacturado =
        data.montoFacturado === null
          ? null
          : String(data.montoFacturado);
    }

    await this.hospitalizacionRepository.save(
      hospitalizacion,
    );

    return this.findOne(id, usuario);
  }
}
