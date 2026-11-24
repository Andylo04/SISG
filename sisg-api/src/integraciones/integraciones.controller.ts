
import { Controller, Get } from '@nestjs/common';
import { IntegracionesService } from './integraciones.service.js';

@Controller('integraciones')
export class IntegracionesController {
  constructor(
    private readonly integracionesService: IntegracionesService,
  ) {}

  @Get('aseguradoras')
  obtenerAseguradoras() {
    return this.integracionesService.obtenerAseguradoras();
  }

  @Get('hospitales-afiliados')
  obtenerHospitalesAfiliados() {
    return this.integracionesService.obtenerHospitalesAfiliados();
  }

  @Get('resumen')
  obtenerResumen() {
    return this.integracionesService.obtenerResumen();
  }
}
