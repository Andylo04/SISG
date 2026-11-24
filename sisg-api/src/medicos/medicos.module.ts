
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicosController } from './medicos.controller.js';
import { MedicosService } from './medicos.service.js';

import { Medico } from './entities/medico.entity.js';
import { Especialidad } from '../especialidades/entities/especialidad.entity.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medico,
      Especialidad,
    ]),
    AuthModule,
  ],
  controllers: [MedicosController],
  providers: [MedicosService],
  exports: [MedicosService],
})
export class MedicosModule {}
