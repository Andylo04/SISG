
import { Controller, Get } from '@nestjs/common';

import { MunicipiosService } from './municipios.service.js';

@Controller('municipios')
export class MunicipiosController {
  constructor(
    private readonly municipiosService: MunicipiosService,
  ) {}

  @Get()
  findAll() {
    return this.municipiosService.findAll();
  }
}
