
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Paciente } from './entities/paciente.entity.js';
import { Municipio } from '../municipios/entities/municipio.entity.js';

import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paciente,
      Municipio,
    ]),
    AuthModule,
  ],
  controllers: [PacientesController],
  providers: [PacientesService],
  exports: [PacientesService],
})
export class PacientesModule {}
