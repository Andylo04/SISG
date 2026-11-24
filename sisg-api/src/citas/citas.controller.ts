
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Request } from 'express';

import { CitasService } from './citas.service.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  Roles,
  RolNombre,
} from '../auth/roles.decorator.js';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

interface RequestAutenticado extends Request {
  user: UsuarioAutenticado;
}

interface CrearCitaDto {
  pacienteId: number;
  medicoId: number;
  hospitalId: number;
  fechaHoraProgramada: string;
  estado?: string;
}

interface ActualizarCitaDto {
  pacienteId?: number;
  medicoId?: number;
  hospitalId?: number;
  fechaHoraProgramada?: string;
  estado?: string;
}

@Controller('citas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
  ) {}

  // ==========================================
  // CONSULTAR TODAS LAS CITAS
  // ==========================================

  @Get()
  findAll(
    @Req() req: RequestAutenticado,
    @Query('busqueda') busqueda?: string,
    @Query('estado') estado?: string,
  ) {
    return this.citasService.findAll(
      busqueda,
      estado,
      req.user,
    );
  }

  // ==========================================
  // CONSULTAR UNA CITA
  // ==========================================

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestAutenticado,
  ) {
    return this.citasService.findOne(
      id,
      req.user,
    );
  }

  // ==========================================
  // CREAR CITA
  // ADMINISTRADOR - MEDICO - HOSPITAL
  // ==========================================

  @Post()
  @Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
  create(
    @Body() data: CrearCitaDto,
    @Req() req: RequestAutenticado,
  ) {
    console.log('SOLICITUD DE NUEVA CITA:', {
      datos: data,
      usuario: req.user,
    });

    return this.citasService.create(
      data,
      req.user,
    );
  }

  // ==========================================
  // ACTUALIZAR CITA
  // ADMINISTRADOR - MEDICO - HOSPITAL
  // ==========================================

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ActualizarCitaDto,
    @Req() req: RequestAutenticado,
  ) {
    console.log('SOLICITUD DE ACTUALIZACIÓN DE CITA:', {
      citaId: id,
      datos: data,
      usuario: req.user,
    });

    return this.citasService.update(
      id,
      data,
      req.user,
    );
  }

  // ==========================================
  // CANCELAR CITA
  // ADMINISTRADOR - MEDICO - HOSPITAL
  // ==========================================

  @Put(':id/cancelar')
  @Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestAutenticado,
  ) {
    console.log('SOLICITUD DE CANCELACIÓN DE CITA:', {
      citaId: id,
      usuario: req.user,
    });

    return this.citasService.cancelar(
      id,
      req.user,
    );
  }
}
