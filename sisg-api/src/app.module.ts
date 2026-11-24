
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseConfig } from './database.config.js';

import { MedicosModule } from './medicos/medicos.module.js';
import { HospitalesModule } from './hospitales/hospitales.module.js';
import { MunicipiosModule } from './municipios/municipios.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { CitasModule } from './citas/citas.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { HospitalizacionesModule } from './hospitalizaciones/hospitalizaciones.module.js';
import { IntegracionesModule } from './integraciones/integraciones.module.js';
import { ConsultasModule } from './consultas/consultas.module.js';
import { AuthModule } from './auth/auth.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),

    MedicosModule,
    HospitalesModule,
    MunicipiosModule,
    PacientesModule,
    CitasModule,
    AuditoriaModule,
    HospitalizacionesModule,
    IntegracionesModule,
    ConsultasModule,

    AuthModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
