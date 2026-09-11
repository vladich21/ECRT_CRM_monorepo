import { Transform, Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

function emptyToNull({ value }: { value: unknown }) {
  return value === '' ? null : value;
}

export class SetPurchaseMethodDto {
  @IsUUID()
  method_id!: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  method_justification?: string | null;

  @IsString()
  updated_at!: string;
}

export class SetPurchaseMethodEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SetPurchaseMethodDto)
  body!: SetPurchaseMethodDto;
}
