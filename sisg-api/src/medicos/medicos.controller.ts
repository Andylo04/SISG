
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { MedicosService } from './medicos.service.js';
import { Medico } from './entities/medico.entity.js';

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

@Controller('medicos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class MedicosController {
  constructor(
    private readonly medicosService: MedicosService,
  ) {}

  // GET /medicos
  @Get()
  findAll(
    @Req() req: RequestAutenticado,
  ): Promise<Medico[]> {
    return this.medicosService.findAll(req.user);
  }

  // GET /medicos/1
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestAutenticado,
  ): Promise<Medico> {
    return this.medicosService.findOne(id, req.user);
  }

  // POST /medicos: solo administrador
  @Post()
  @Roles('ADMINISTRADOR')
  create(
    @Body() datos: Partial<Medico>,
  ): Promise<Medico> {
    return this.medicosService.create(datos);
  }

  // PATCH /medicos/1: solo administrador
  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: Partial<Medico>,
  ): Promise<Medico> {
    return this.medicosService.update(id, datos);
  }

  // DELETE /medicos/1: solo administrador
  @Delete(':id')
  @Roles('ADMINISTRADOR')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.medicosService.remove(id);
  }
}
