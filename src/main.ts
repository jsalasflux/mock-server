import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  // agrega delay a las respuestas. en msecs.
  app.use(function (req, res, next) {
    setTimeout(next, 500);
  });

  //Carpeta publica banners
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/banners/',
  });

  await app.listen(3000);
}
bootstrap();
