
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { compare } from 'bcryptjs';

import { Usuario } from '../usuarios/entities/usuario.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,

    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { email },
      relations: {
        rol: true,
      },
    });

    if (!usuario || usuario.activo !== 1) {
      throw new UnauthorizedException(
        'Credenciales incorrectas',
      );
    }

    const passwordValida = await compare(
      password,
      usuario.password_hash,
    );

    if (!passwordValida) {
      throw new UnauthorizedException(
        'Credenciales incorrectas',
      );
    }

    if (!usuario.rol || usuario.rol.activo !== 1) {
      throw new UnauthorizedException(
        'El rol de usuario está inactivo',
      );
    }

    // Normalizar identificadores para el JWT.
    const medicoId =
      usuario.medico_id != null
        ? Number(usuario.medico_id)
        : null;

    const hospitalId =
      usuario.hospital_id != null
        ? Number(usuario.hospital_id)
        : null;

    // Construir información del usuario autenticado.
    const payload = {
      sub: Number(usuario.usuario_id),
      email: usuario.email,
      rol: usuario.rol.nombre,
      medicoId,
      hospitalId,
    };

    // Actualizar último acceso.
    usuario.ultimo_acceso = new Date();

    await this.usuarioRepository.save(usuario);

    // Generar JWT.
    const accessToken = await this.jwtService.signAsync(
      payload,
    );

    return {
      mensaje: 'Inicio de sesión exitoso',

      access_token: accessToken,

      usuario: {
        usuario_id: usuario.usuario_id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        medico_id: medicoId,
        hospital_id: hospitalId,
        debe_cambiar_password: Boolean(
          usuario.debe_cambiar_password,
        ),
      },
    };
  }
}
