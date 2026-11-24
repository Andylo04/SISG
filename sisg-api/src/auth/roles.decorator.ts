
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type RolNombre =
  | 'ADMINISTRADOR'
  | 'MEDICO'
  | 'HOSPITAL';

export const Roles = (...roles: RolNombre[]) =>
  SetMetadata(ROLES_KEY, roles);
