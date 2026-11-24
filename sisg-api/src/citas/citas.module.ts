
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cita } from './entities/cita.entity.js';
import { Paciente } from '../pacientes/entities/paciente.entity.js';
import { Medico } from '../medicos/entities/medico.entity.js';
import { Hospital } from '../hospitales/entities/hospital.entity.js';

import { CitasController } from './citas.controller.js';
import { CitasService } from './citas.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cita,
      Paciente,
      Medico,
      Hospital,
    ]),
    AuthModule,
  ],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
