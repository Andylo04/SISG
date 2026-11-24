
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Hospitalizacion } from './entities/hospitalizacion.entity.js';
import { Paciente } from '../pacientes/entities/paciente.entity.js';
import { Medico } from '../medicos/entities/medico.entity.js';
import { Hospital } from '../hospitales/entities/hospital.entity.js';

import { HospitalizacionesController } from './hospitalizaciones.controller.js';
import { HospitalizacionesService } from './hospitalizaciones.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hospitalizacion,
      Paciente,
      Medico,
      Hospital,
    ]),
    AuthModule,
  ],

  controllers: [
    HospitalizacionesController,
  ],

  providers: [
    HospitalizacionesService,
  ],

  exports: [
    HospitalizacionesService,
  ],
})
export class HospitalizacionesModule {}
