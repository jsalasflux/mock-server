import { Module } from '@nestjs/common';
import { LowdbService } from '../../lowdb/lowdb.service';
import { FedaUsuariosMockController } from './feda-usuarios-mock.controller';

@Module({
  controllers: [FedaUsuariosMockController],
  providers: [LowdbService],
})
export class FedaUsuariosMockModule {}