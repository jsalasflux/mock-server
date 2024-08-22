import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MorganModule, MorganInterceptor } from 'nest-morgan';

import * as index from '.';

@Module({
  imports: [MorganModule, ...index.moduleMocks],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MorganInterceptor(
        'Peticion :method - Url :url - Tiempo Respuesta :response-time ms',
      ),
    },
  ],
})
export class AppModule {}
