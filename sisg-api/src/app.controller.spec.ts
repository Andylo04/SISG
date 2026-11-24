
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([
      { databaseName: 'sisg' },
    ]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('debe comprobar la conexión con MySQL', async () => {
    const result = await appController.testDatabase();

    expect(result.connected).toBe(true);
    expect(result.database).toBe('sisg');
  });
});
