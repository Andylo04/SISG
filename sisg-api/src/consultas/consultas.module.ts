
import { Module } from '@nestjs/common';
import { ConsultasController } from './consultas.controller.js';
import { ConsultasService } from './consultas.service.js';
import { IntegracionesModule } from '../integraciones/integraciones.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    IntegracionesModule,
    AuthModule,
  ],
  controllers: [ConsultasController],
  providers: [ConsultasService],
  exports: [ConsultasService],
})
export class ConsultasModule {}
