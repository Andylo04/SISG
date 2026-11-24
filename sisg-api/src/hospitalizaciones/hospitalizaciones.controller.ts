
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { HospitalizacionesService } from './hospitalizaciones.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('hospitalizaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'MEDICO', 'HOSPITAL')
export class HospitalizacionesController {
  constructor(
    private readonly hospitalizacionesService: HospitalizacionesService,
  ) {}

  // ==========================================
  // LISTAR HOSPITALIZACIONES
  // ==========================================

  @Get()
  findAll(
    @Query('busqueda') busqueda: string,
    @Query('estado') estado: string,
    @Req() req: any,
  ) {
    return this.hospitalizacionesService.findAll(
      busqueda,
      estado,
      req.user,
    );
  }

  // ==========================================
  // CONSULTAR POR ID
  // ==========================================

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.hospitalizacionesService.findOne(
      id,
      req.user,
    );
  }

  // ==========================================
  // REGISTRAR INGRESO
  // ADMINISTRADOR Y HOSPITAL
  // ==========================================

  @Post()
  @Roles('ADMINISTRADOR', 'HOSPITAL')
  create(
    @Body()
    data: {
      pacienteId: number;
      medicoId: number;
      hospitalId: number;
      cie10Ingreso?: string;
      fechaIngreso: string;
      montoFacturado?: number | null;
      codigoAseguradora?: string | null;
    },
    @Req() req: any,
  ) {
    return this.hospitalizacionesService.create(
      data,
      req.user,
    );
  }

  // ==========================================
  // ACTUALIZAR HOSPITALIZACIÓN
  // ADMINISTRADOR Y HOSPITAL
  // ==========================================

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'HOSPITAL')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      pacienteId?: number;
      medicoId?: number;
      hospitalId?: number;
      cie10Ingreso?: string | null;
      fechaIngreso?: string;
      montoFacturado?: number | null;
      codigoAseguradora?: string | null;
    },
    @Req() req: any,
  ) {
    return this.hospitalizacionesService.update(
      id,
      data,
      req.user,
    );
  }

  // ==========================================
  // REGISTRAR EGRESO
  // ADMINISTRADOR Y HOSPITAL
  // ==========================================

  @Patch(':id/egreso')
  @Roles('ADMINISTRADOR', 'HOSPITAL')
  registrarEgreso(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      fechaEgreso: string;
      tipoEgreso: string;
      montoFacturado?: number | null;
    },
    @Req() req: any,
  ) {
    return this.hospitalizacionesService.registrarEgreso(
      id,
      data,
      req.user,
    );
  }
}
