import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateFileMetaDto {
  @IsOptional()
  @IsBoolean()
  responseRequired?: boolean;

  /** ISO-дата срока или null — сбросить */
  @IsOptional()
  @IsString()
  responseDeadline?: string | null;
}
