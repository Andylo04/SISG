
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaEvento } from './entities/auditoria-evento.entity.js';
import { AuditoriaMensual } from './entities/auditoria-mensual.entity.js';

import { AuditoriaService } from './auditoria.service.js';
import { AuditoriaController } from './auditoria.controller.js';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditoriaEvento,
      AuditoriaMensual,
    ]),
    AuthModule,
  ],
  controllers: [
    AuditoriaController,
  ],
  providers: [
    AuditoriaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
  exports: [
    AuditoriaService,
  ],
})
export class AuditoriaModule {}
