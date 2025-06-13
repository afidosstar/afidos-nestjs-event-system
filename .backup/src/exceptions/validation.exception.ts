import { BadRequestException } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  constructor(field: string, message: string) {
    super(`Validation failed for field '${field}': ${message}`);
  }
}