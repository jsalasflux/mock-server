import { Module } from '@nestjs/common';
import { LowdbService } from '../../lowdb/lowdb.service';
import { FedaMockController } from './feda-mock.controller';

@Module({
  controllers: [FedaMockController],
  providers: [LowdbService],
})
export class FedaMockModule {}