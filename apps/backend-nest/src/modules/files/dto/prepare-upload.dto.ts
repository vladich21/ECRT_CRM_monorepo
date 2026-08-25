import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Тело POST /upload/prepare — оркестрация загрузки через files-service. */
export class PrepareUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  documentSection?: string;

  /** Опционально: клиент уже знает SHA-256 содержимого. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  expectedSha256?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  responseRequired?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  responseDeadline?: string;
}
