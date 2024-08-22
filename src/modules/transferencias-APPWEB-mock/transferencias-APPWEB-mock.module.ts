import { Module } from '@nestjs/common';
import { TransferenciasAPPWEBMockController } from './transferencias-APPWEB-mock.controller';
import { LowdbService } from '../../lowdb/lowdb.service';

@Module({
  controllers: [TransferenciasAPPWEBMockController],
  providers: [LowdbService],
})
export class TransferenciasAPPWEBMockModule {}
