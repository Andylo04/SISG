
import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { AuditoriaService } from './auditoria.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'HOSPITAL')
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get('historial')
  @Roles('ADMINISTRADOR')
  obtenerHistorial(@Req() req: any) {
    return this.auditoriaService.obtenerHistorial(
      req.user,
    );
  }

  @Get('eventos')
  obtenerEventos(
    @Query('mes') mes: string,
    @Query('año') año: string,
    @Query('modulo') modulo: string,
    @Req() req: any,
  ) {
    return this.auditoriaService.obtenerEventos(
      req.user,
      mes ? Number(mes) : undefined,
      año ? Number(año) : undefined,
      modulo,
    );
  }

  @Get('resumen')
  obtenerResumen(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('año', ParseIntPipe) año: number,
    @Req() req: any,
  ) {
    return this.auditoriaService.obtenerResumen(
      req.user,
      mes,
      año,
    );
  }

  @Get('mensual/:mes/:año')
  obtenerAuditoriaMensual(
    @Param('mes', ParseIntPipe) mes: number,
    @Param('año', ParseIntPipe) año: number,
    @Req() req: any,
  ) {
    return this.auditoriaService.obtenerAuditoriaMensual(
      req.user,
      mes,
      año,
    );
  }

  @Patch('revision/:mes/:año')
  @Roles('ADMINISTRADOR')
  guardarRevision(
    @Param('mes', ParseIntPipe) mes: number,
    @Param('año', ParseIntPipe) año: number,
    @Body()
    data: {
      observaciones?: string;
      conclusiones?: string;
      recomendaciones?: string;
    },
    @Req() req: any,
  ) {
    return this.auditoriaService.guardarRevision(
      mes,
      año,
      data,
      req.user,
    );
  }

  @Put('cerrar/:mes/:año')
  @Roles('ADMINISTRADOR')
  cerrarAuditoria(
    @Param('mes', ParseIntPipe) mes: number,
    @Param('año', ParseIntPipe) año: number,
    @Req() req: any,
  ) {
    return this.auditoriaService.cerrarAuditoria(
      mes,
      año,
      req.user,
    );
  }
}
