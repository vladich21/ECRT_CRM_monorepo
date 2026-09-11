import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

import { MONEY_NUMERIC_MAX } from '../domain/purchase-request.enums';
import {
  MAX_PAYMENT_TERM_LINES,
  QUOTE_DAY_KINDS,
  QUOTE_PAYMENT_TYPES,
} from '../domain/purchase-quote.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull({ value }: { value: unknown }) {
  return value === '' ? null : value;
}

function optionalInt({ value }: { value: unknown }) {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

export class PurchaseQuotePaymentTermDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(100)
  share!: number;

  @IsIn(QUOTE_PAYMENT_TYPES)
  payment_type!: (typeof QUOTE_PAYMENT_TYPES)[number];

  @IsOptional()
  @Transform(optionalInt)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value != null)
  @IsIn(QUOTE_DAY_KINDS)
  day_kind?: (typeof QUOTE_DAY_KINDS)[number] | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  base_event?: string | null;
}

export class CreatePurchaseQuoteDto {
  @IsUUID()
  partner_id!: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(60)
  quote_number?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO_DATE, { message: 'quote_date должно быть датой YYYY-MM-DD' })
  quote_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO_DATE, { message: 'valid_until должно быть датой YYYY-MM-DD' })
  valid_until?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(MONEY_NUMERIC_MAX)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency_code?: string;

  @IsUUID()
  vat_rate_id!: string;

  @IsOptional()
  @Transform(optionalInt)
  @IsInt()
  @Min(0)
  @Max(3650)
  delivery_days?: number | null;

  @IsOptional()
  @Transform(optionalInt)
  @IsInt()
  @Min(0)
  @Max(1200)
  warranty_months?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  contact_name?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  comment?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PAYMENT_TERM_LINES)
  @ValidateNested({ each: true })
  @Type(() => PurchaseQuotePaymentTermDto)
  payment_terms!: PurchaseQuotePaymentTermDto[];

  /** Для 409: клиент шлёт updated_at запроса. */
  @IsString()
  updated_at!: string;
}

export class CreatePurchaseQuoteEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreatePurchaseQuoteDto)
  body!: CreatePurchaseQuoteDto;
}

export class UpdatePurchaseQuoteDto {
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(60)
  quote_number?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO_DATE, { message: 'quote_date должно быть датой YYYY-MM-DD' })
  quote_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO_DATE, { message: 'valid_until должно быть датой YYYY-MM-DD' })
  valid_until?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(MONEY_NUMERIC_MAX)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency_code?: string;

  @IsOptional()
  @IsUUID()
  vat_rate_id?: string;

  @IsOptional()
  @Transform(optionalInt)
  @IsInt()
  @Min(0)
  @Max(3650)
  delivery_days?: number | null;

  @IsOptional()
  @Transform(optionalInt)
  @IsInt()
  @Min(0)
  @Max(1200)
  warranty_months?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  contact_name?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  comment?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PAYMENT_TERM_LINES)
  @ValidateNested({ each: true })
  @Type(() => PurchaseQuotePaymentTermDto)
  payment_terms?: PurchaseQuotePaymentTermDto[];

  /** Для 409: клиент шлёт updated_at КП. */
  @IsString()
  updated_at!: string;
}

export class UpdatePurchaseQuoteEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => UpdatePurchaseQuoteDto)
  body!: UpdatePurchaseQuoteDto;
}
