
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RolNombre } from './roles.decorator.js';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos =
      this.reflector.getAllAndOverride<RolNombre[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Si la ruta no especifica roles, no se restringe por rol.
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const usuario =
      request.user as UsuarioAutenticado | undefined;

    if (!usuario) {
      throw new ForbiddenException(
        'Usuario no autenticado',
      );
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
