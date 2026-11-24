
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Hospital } from './entities/hospital.entity.js';
import { Municipio } from '../municipios/entities/municipio.entity.js';

import { HospitalesController } from './hospitales.controller.js';
import { HospitalesService } from './hospitales.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hospital,
      Municipio,
    ]),
    AuthModule,
  ],
  controllers: [HospitalesController],
  providers: [HospitalesService],
  exports: [HospitalesService],
})
export class HospitalesModule {}
