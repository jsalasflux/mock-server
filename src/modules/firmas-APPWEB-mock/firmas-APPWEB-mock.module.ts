import { Module } from '@nestjs/common';
import { FirmasAPPWEBMockController } from './firmas-APPWEB-mock.controller';
import { LowdbService } from '../../lowdb/lowdb.service';

@Module({
  controllers: [FirmasAPPWEBMockController],
  providers: [LowdbService],
})
export class FirmasAPPWEBMockModule {}
