import { IsString, IsObject, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class EventEmissionDto {
  @IsString()
  eventType: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  waitForResult?: boolean;

  @IsOptional()
  @IsEnum(['sync', 'async', 'auto'])
  mode?: 'sync' | 'async' | 'auto';

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @IsOptional()
  @IsNumber()
  delay?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}
