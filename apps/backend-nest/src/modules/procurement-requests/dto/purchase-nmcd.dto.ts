import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { MONEY_NUMERIC_MAX } from '../domain/purchase-request.enums';
import { PRICE_METHODS } from '../domain/purchase-quote.enums';

function emptyToNull({ value }: { value: unknown }) {
  return value === '' ? null : value;
}

export class FixPurchasePriceDto {
  @IsIn(PRICE_METHODS)
  method!: (typeof PRICE_METHODS)[number];

  @IsOptional()
  @Transform(emptyToNull)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(MONEY_NUMERIC_MAX)
  amount?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @IsString()
  updated_at!: string;
}

export class FixPurchasePriceEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => FixPurchasePriceDto)
  body!: FixPurchasePriceDto;
}

export class SelectPurchaseSupplierDto {
  @IsUUID()
  quote_id!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Укажите хотя бы одну причину выбора' })
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  reason_codes!: string[];

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @IsString()
  updated_at!: string;
}

export class SelectPurchaseSupplierEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SelectPurchaseSupplierDto)
  body!: SelectPurchaseSupplierDto;
}
