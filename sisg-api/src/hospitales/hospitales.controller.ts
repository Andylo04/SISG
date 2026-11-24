
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { HospitalesService } from './hospitales.service.js';
import { Hospital } from './entities/hospital.entity.js';

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

@Controller('hospitales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class HospitalesController {
  constructor(
    private readonly hospitalesService: HospitalesService,
  ) {}

  // Listar hospitales según el rol
  @Get()
  findAll(
    @Req() req: RequestAutenticado,
    @Query('busqueda') busqueda?: string,
    @Query('estado') estado?: string,
  ) {
    return this.hospitalesService.findAll(
      busqueda,
      estado,
      req.user,
    );
  }

  // Consultar hospital por ID
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestAutenticado,
  ) {
    return this.hospitalesService.findOne(id, req.user);
  }

  // Registrar: solo administrador
  @Post()
  @Roles('ADMINISTRADOR')
  create(@Body() data: Partial<Hospital>) {
    return this.hospitalesService.create(data);
  }

  // Actualizar: solo administrador
  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Hospital>,
  ) {
    return this.hospitalesService.update(id, data);
  }

  // Desactivar: solo administrador
  @Delete(':id')
  @Roles('ADMINISTRADOR')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalesService.remove(id);
  }

  // Reactivar: solo administrador
  @Put(':id/activar')
  @Roles('ADMINISTRADOR')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalesService.activate(id);
  }
}
