import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import {Logger} from "@nestjs/common";


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule,{
    snapshot: true,
  });
  const port = process.env.PORT || 3000;
  await app.listen(port,() => {
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📊 Health check: http://localhost:${port}/health`);
    logger.log(`📝 Example endpoints: http://localhost:${port}/users`);
  });
}
bootstrap();

