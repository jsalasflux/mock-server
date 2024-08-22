import { Module } from '@nestjs/common';
import { LowdbService } from '../../lowdb/lowdb.service';
import { FedaLoginMockController } from './feda-login-mock.controller';

@Module({
  controllers: [FedaLoginMockController],
  providers: [LowdbService],
})
export class FedaLoginMockModule {}