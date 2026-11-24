
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  medicoId: number | null;
  hospitalId: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  constructor(
    configService: ConfigService,
  ) {
    const secret = configService.get<string>(
      'JWT_SECRET',
    );

    if (!secret) {
      throw new Error(
        'JWT_SECRET no está configurado',
      );
    }

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    if (
      !payload.sub ||
      !payload.rol ||
      !payload.email
    ) {
      throw new UnauthorizedException(
        'Token inválido',
      );
    }

    return {
      usuarioId: Number(payload.sub),
      email: payload.email,
      rol: payload.rol,

      medicoId:
        payload.medicoId != null
          ? Number(payload.medicoId)
          : null,

      hospitalId:
        payload.hospitalId != null
          ? Number(payload.hospitalId)
          : null,
    };
  }
}
