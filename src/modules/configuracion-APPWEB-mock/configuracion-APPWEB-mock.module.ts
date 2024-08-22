import { Module } from '@nestjs/common';
import { ConfiguracionAPPWEBMockController } from './configuracion-APPWEB-mock.controller';
import { LowdbService } from '../../lowdb/lowdb.service';

@Module({
  controllers: [ConfiguracionAPPWEBMockController],
  providers: [LowdbService],
})
export class ConfiguracionAPPWEBMockModule {}
