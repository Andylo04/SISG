
import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { ConsultasService } from './consultas.service.js';

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

@Controller('consultas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class ConsultasController {
  constructor(
    private readonly consultasService: ConsultasService,
  ) {}

  @Get('resumen')
  obtenerResumen(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerResumen(req.user);
  }

  @Get('medicos-pacientes')
  obtenerMedicosPacientes(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerMedicosPacientes(req.user);
  }

  @Get('hospitales')
  obtenerHospitales(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerHospitales(req.user);
  }

  @Get('aseguradoras')
  obtenerAseguradoras(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerAseguradoras(req.user);
  }

  @Get('diagnosticos')
  obtenerDiagnosticos(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerDiagnosticos(req.user);
  }

  @Get('indicadores')
  obtenerIndicadores(@Req() req: RequestAutenticado) {
    return this.consultasService.obtenerIndicadores(req.user);
  }
}
