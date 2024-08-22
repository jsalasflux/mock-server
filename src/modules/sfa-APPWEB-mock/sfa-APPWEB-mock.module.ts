import { Module } from '@nestjs/common';
import { LowdbService } from '../../lowdb/lowdb.service';
import { SfaAPPWEBMockController } from './sfa-APPWEB-mock.controller';

@Module({
  controllers: [SfaAPPWEBMockController],
  providers: [LowdbService],
})
export class SfaAPPWEBMockModule {}
