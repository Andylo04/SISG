
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Municipio } from './entities/municipio.entity.js';

@Injectable()
export class MunicipiosService {
  constructor(
    @InjectRepository(Municipio)
    private readonly municipioRepository: Repository<Municipio>,
  ) {}

  async findAll() {
    return this.municipioRepository.find({
      order: {
        nombre: 'ASC',
      },
    });
  }
}
