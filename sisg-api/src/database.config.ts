
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'sisg',
  password: 'sisg123',
  database: 'sisg',
  autoLoadEntities: true,
  synchronize: false,
};
