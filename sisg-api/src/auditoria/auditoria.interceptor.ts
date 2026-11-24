
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

import { AuditoriaService } from './auditoria.service.js';

interface UsuarioRequest {
  usuarioId?: number;
  email?: string;
  rol?: string;
  hospitalId?: number | null;
}

interface RequestAuditoria extends Request {
  user?: UsuarioRequest;
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly auditoriaService: AuditoriaService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();

    const request =
      http.getRequest<RequestAuditoria>();

    const response = http.getResponse<Response>();

    const metodo = request.method.toUpperCase();

    const ruta = request.originalUrl.split('?')[0];

    // Solo registrar operaciones que modifican información.
    if (
      !['POST', 'PATCH', 'PUT', 'DELETE'].includes(metodo)
    ) {
      return next.handle();
    }

    // No registrar autenticación ni operaciones de auditoría.
    if (
      ruta.startsWith('/auth') ||
      ruta.startsWith('/auditoria')
    ) {
      return next.handle();
    }

    const usuario = request.user;

    // No registrar solicitudes sin identidad autenticada.
    if (!usuario?.usuarioId || !usuario.rol) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (resultado) => {
          const segmentos = ruta
            .split('/')
            .filter(Boolean);

          const modulo = segmentos[0] || 'sistema';

          const entidad = modulo.replace(/s$/, '');

          const acciones: Record<string, string> = {
            POST: 'CREAR',
            PATCH: 'ACTUALIZAR',
            PUT: 'ACTUALIZAR',
            DELETE: 'ELIMINAR',
          };

          const posibleId = segmentos[1];

          const entidadId =
            posibleId && /^\d+$/.test(posibleId)
              ? posibleId
              : resultado?.hospitalizacionId?.toString() ??
                resultado?.citaId?.toString() ??
                resultado?.consultaId?.toString() ??
                resultado?.pacienteId?.toString() ??
                resultado?.medicoId?.toString() ??
                resultado?.hospitalId?.toString() ??
                null;

          // El hospital se obtiene primero de la sesión.
          // Para el administrador se intenta obtener del
          // cuerpo de la solicitud o del resultado.
          const hospitalId =
            usuario.hospitalId ??
            request.body?.hospitalId ??
            request.body?.hospital_id ??
            resultado?.hospitalId ??
            resultado?.hospital_id ??
            null;

          // Evitar guardar contraseñas, tokens o datos sensibles.
          const datosNuevos = { ...request.body };

          delete datosNuevos.password;
          delete datosNuevos.contrasena;
          delete datosNuevos.token;
          delete datosNuevos.access_token;
          delete datosNuevos.refresh_token;
          delete datosNuevos.dpiHash;

          void this.auditoriaService
            .registrarEvento({
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.email ?? null,
              usuarioRol: usuario.rol,
              hospitalId:
                hospitalId != null
                  ? Number(hospitalId)
                  : null,
              modulo,
              accion: acciones[metodo],
              entidad,
              entidadId,
              metodoHttp: metodo,
              endpoint: ruta,
              codigoRespuesta: response.statusCode,
              direccionIp: request.ip ?? null,
              datosAnteriores: null,
              datosNuevos:
                Object.keys(datosNuevos).length > 0
                  ? datosNuevos
                  : null,
            })
            .catch((error) => {
              console.error(
                'Error registrando auditoría:',
                error.message,
              );
            });
        },
      }),
    );
  }
}
