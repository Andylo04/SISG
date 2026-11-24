
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { AuditoriaEvento } from './entities/auditoria-evento.entity.js';
import { AuditoriaMensual } from './entities/auditoria-mensual.entity.js';

type RolNombre = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface UsuarioAuditoria {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaEvento)
    private readonly eventoRepository: Repository<AuditoriaEvento>,

    @InjectRepository(AuditoriaMensual)
    private readonly mensualRepository: Repository<AuditoriaMensual>,
  ) {}

  // ==========================================
  // VALIDAR PERIODO
  // ==========================================

  private validarPeriodo(mes: number, año: number) {
    if (
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !Number.isInteger(año) ||
      año < 2020 ||
      año > 2100
    ) {
      throw new BadRequestException(
        'El mes o año seleccionado no es válido.',
      );
    }
  }

  // ==========================================
  // VALIDAR ACCESO
  // ==========================================

  private validarAcceso(usuario: UsuarioAuditoria) {
    if (!usuario) {
      throw new ForbiddenException(
        'Usuario no autenticado.',
      );
    }

    if (
      !['ADMINISTRADOR', 'HOSPITAL'].includes(usuario.rol)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para consultar auditoría.',
      );
    }

    if (
      usuario.rol === 'HOSPITAL' &&
      !usuario.hospitalId
    ) {
      throw new ForbiddenException(
        'La cuenta del hospital no tiene una institución asociada.',
      );
    }
  }

  // ==========================================
  // APLICAR FILTRO POR HOSPITAL
  // ==========================================

  private aplicarAlcance(
    query: SelectQueryBuilder<AuditoriaEvento>,
    usuario: UsuarioAuditoria,
  ) {
    this.validarAcceso(usuario);

    if (usuario.rol === 'HOSPITAL') {
      query.andWhere(
        'evento.hospitalId = :hospitalId',
        {
          hospitalId: usuario.hospitalId,
        },
      );
    }

    return query;
  }

  // ==========================================
  // REGISTRAR EVENTO
  // ==========================================

  async registrarEvento(
    data: Partial<AuditoriaEvento>,
  ) {
    const evento = this.eventoRepository.create(data);

    return this.eventoRepository.save(evento);
  }

  // ==========================================
  // OBTENER EVENTOS
  // ==========================================

  async obtenerEventos(
    usuario: UsuarioAuditoria,
    mes?: number,
    año?: number,
    modulo?: string,
  ) {
    this.validarAcceso(usuario);

    if (
      (mes !== undefined) !==
      (año !== undefined)
    ) {
      throw new BadRequestException(
        'Debes indicar tanto el mes como el año.',
      );
    }

    if (mes !== undefined && año !== undefined) {
      this.validarPeriodo(mes, año);
    }

    const query = this.eventoRepository
      .createQueryBuilder('evento')
      .orderBy('evento.fechaEvento', 'DESC');

    this.aplicarAlcance(query, usuario);

    if (mes !== undefined && año !== undefined) {
      const inicio = new Date(año, mes - 1, 1);
      const fin = new Date(año, mes, 1);

      query.andWhere(
        `evento.fechaEvento >= :inicio
         AND evento.fechaEvento < :fin`,
        { inicio, fin },
      );
    }

    if (modulo?.trim()) {
      query.andWhere(
        'evento.modulo = :modulo',
        { modulo: modulo.trim() },
      );
    }

    return query.getMany();
  }

  // ==========================================
  // OBTENER RESUMEN
  // ==========================================

  async obtenerResumen(
    usuario: UsuarioAuditoria,
    mes: number,
    año: number,
  ) {
    this.validarAcceso(usuario);
    this.validarPeriodo(mes, año);

    const eventos = await this.obtenerEventos(
      usuario,
      mes,
      año,
    );

    const porModulo: Record<string, number> = {};
    const porAccion: Record<string, number> = {};

    for (const evento of eventos) {
      porModulo[evento.modulo] =
        (porModulo[evento.modulo] || 0) + 1;

      porAccion[evento.accion] =
        (porAccion[evento.accion] || 0) + 1;
    }

    return {
      mes,
      año,
      totalEventos: eventos.length,
      porModulo,
      porAccion,
      eventos,
    };
  }

  // ==========================================
  // AUDITORIA MENSUAL
  // ==========================================

  async obtenerAuditoriaMensual(
    usuario: UsuarioAuditoria,
    mes: number,
    año: number,
  ) {
    this.validarAcceso(usuario);
    this.validarPeriodo(mes, año);

    const resumen = await this.obtenerResumen(
      usuario,
      mes,
      año,
    );

    // El hospital consulta sus movimientos,
    // pero no la revisión global del administrador.
    if (usuario.rol === 'HOSPITAL') {
      return {
        auditoria: null,
        resumen,
      };
    }

    const auditoria = await this.mensualRepository.findOne({
      where: { mes, año },
    });

    return {
      auditoria,
      resumen,
    };
  }

  // ==========================================
  // GUARDAR REVISION MENSUAL
  // SOLO ADMINISTRADOR
  // ==========================================

  async guardarRevision(
    mes: number,
    año: number,
    data: {
      observaciones?: string;
      conclusiones?: string;
      recomendaciones?: string;
    },
    usuario: UsuarioAuditoria,
  ) {
    this.validarAcceso(usuario);

    if (usuario.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo el administrador puede guardar revisiones mensuales.',
      );
    }

    this.validarPeriodo(mes, año);

    let auditoria = await this.mensualRepository.findOne({
      where: { mes, año },
    });

    if (!auditoria) {
      auditoria = this.mensualRepository.create({
        mes,
        año,
        estado: 'Pendiente',
      });
    }

    if (auditoria.estado === 'Cerrada') {
      throw new ConflictException(
        'La auditoría está cerrada y no puede modificarse.',
      );
    }

    if (data.observaciones !== undefined) {
      auditoria.observaciones = data.observaciones;
    }

    if (data.conclusiones !== undefined) {
      auditoria.conclusiones = data.conclusiones;
    }

    if (data.recomendaciones !== undefined) {
      auditoria.recomendaciones = data.recomendaciones;
    }

    auditoria.revisadoPor = usuario.email;
    auditoria.estado = 'En revisión';
    auditoria.fechaRevision = new Date();

    return this.mensualRepository.save(auditoria);
  }

  // ==========================================
  // CERRAR AUDITORIA
  // SOLO ADMINISTRADOR
  // ==========================================

  async cerrarAuditoria(
    mes: number,
    año: number,
    usuario: UsuarioAuditoria,
  ) {
    this.validarAcceso(usuario);

    if (usuario.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo el administrador puede cerrar auditorías.',
      );
    }

    this.validarPeriodo(mes, año);

    const auditoria = await this.mensualRepository.findOne({
      where: { mes, año },
    });

    if (!auditoria) {
      throw new NotFoundException(
        'Primero debe guardar la revisión mensual.',
      );
    }

    if (auditoria.estado === 'Cerrada') {
      throw new ConflictException(
        'Esta auditoría ya está cerrada.',
      );
    }

    if (
      !auditoria.observaciones?.trim() ||
      !auditoria.conclusiones?.trim() ||
      !auditoria.revisadoPor?.trim()
    ) {
      throw new BadRequestException(
        'Complete las observaciones, conclusiones y responsable antes de cerrar.',
      );
    }

    auditoria.estado = 'Cerrada';
    auditoria.fechaCierre = new Date();

    return this.mensualRepository.save(auditoria);
  }

  // ==========================================
  // HISTORIAL MENSUAL
  // SOLO ADMINISTRADOR
  // ==========================================

  async obtenerHistorial(usuario: UsuarioAuditoria) {
    this.validarAcceso(usuario);

    if (usuario.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'El historial mensual global es exclusivo del administrador.',
      );
    }

    return this.mensualRepository.find({
      order: {
        año: 'DESC',
        mes: 'DESC',
      },
    });
  }
}
