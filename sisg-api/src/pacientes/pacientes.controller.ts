
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { PacientesService } from './pacientes.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles, RolNombre } from '../auth/roles.decorator.js';

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

@Controller('pacientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class PacientesController {
  constructor(
    private readonly pacientesService: PacientesService,
  ) {}

  // Consultar y buscar pacientes según el rol
  @Get()
  findAll(
    @Req() req: RequestAutenticado,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.pacientesService.findAll(
      busqueda,
      req.user,
    );
  }

  // Consultar paciente por ID
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestAutenticado,
  ) {
    return this.pacientesService.findOne(id, req.user);
  }

  // Registrar paciente: solo administrador
  @Post()
  @Roles('ADMINISTRADOR')
  create(
    @Body()
    data: {
      dpi: string;
      sexo?: string;
      fechaNacimiento?: string;
      municipioId?: number;
    },
  ) {
    return this.pacientesService.create(data);
  }

  // Actualizar paciente: solo administrador
  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      sexo?: string | null;
      fechaNacimiento?: string | null;
      municipioId?: number | null;
    },
  ) {
    return this.pacientesService.update(id, data);
  }
}
