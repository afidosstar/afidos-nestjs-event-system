import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // Enable CORS
    app.enableCors();

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Application running on: http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/notifications/health`);
    console.log(`📈 Metrics: http://localhost:${port}/notifications/metrics`);
}

bootstrap();
