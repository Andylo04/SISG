
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // ESTADO GENERAL DEL SISTEMA
  // ==========================================

  @Get('health')
  async health() {
    let databaseConnected = false;
    let databaseName: string | null = null;

    try {
      const result = await this.dataSource.query(
        'SELECT DATABASE() AS databaseName',
      );

      databaseConnected = true;
      databaseName = result[0]?.databaseName ?? null;
    } catch {
      databaseConnected = false;
    }

    const status = databaseConnected
      ? 'ok'
      : 'degraded';

    return {
      status,
      backend: {
        connected: true,
        message: 'Backend NestJS funcionando',
      },
      database: {
        connected: databaseConnected,
        database: databaseName,
        message: databaseConnected
          ? 'Conexión con MySQL exitosa'
          : 'No se pudo conectar con MySQL',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // PRUEBA DE CONEXIÓN MYSQL
  // ==========================================

  @Get('db-test')
  async testDatabase() {
    try {
      const result = await this.dataSource.query(
        'SELECT DATABASE() AS databaseName',
      );

      return {
        connected: true,
        message: 'Conexión con MySQL exitosa',
        database: result[0]?.databaseName ?? null,
      };
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo establecer conexión con MySQL.',
      );
    }
  }
}
