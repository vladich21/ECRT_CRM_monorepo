import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { FUNDING_SOURCES, MONEY_NUMERIC_MAX } from '../domain/purchase-request.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePurchaseRequestDto {
  @IsString()
  @MaxLength(2000)
  subject!: string;

  @IsString()
  @MaxLength(2000)
  justification!: string;

  @Matches(ISO_DATE, { message: 'required_date должно быть датой YYYY-MM-DD' })
  required_date!: string;

  @IsUUID()
  project_id!: string;

  @IsUUID()
  department_id!: string;

  @IsUUID()
  tech_acceptor_id!: string;

  @IsIn(FUNDING_SOURCES)
  funding_source!: (typeof FUNDING_SOURCES)[number];

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_contract_id?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_stage_id?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(MONEY_NUMERIC_MAX)
  expert_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(MONEY_NUMERIC_MAX)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency_code?: string;

  @IsOptional()
  @IsUUID()
  vat_rate_id?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  vat_included?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_urgent?: boolean;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'request_date должно быть датой YYYY-MM-DD' })
  request_date?: string;
}

export class CreatePurchaseRequestEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreatePurchaseRequestDto)
  body!: CreatePurchaseRequestDto;
}

export class UpdatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'required_date должно быть датой YYYY-MM-DD' })
  required_date?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  tech_acceptor_id?: string;

  @IsOptional()
  @IsIn(FUNDING_SOURCES)
  funding_source?: (typeof FUNDING_SOURCES)[number];

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_contract_id?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_stage_id?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(MONEY_NUMERIC_MAX)
  expert_price?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(MONEY_NUMERIC_MAX)
  amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency_code?: string;

  @IsOptional()
  @IsUUID()
  vat_rate_id?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  vat_included?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_urgent?: boolean;

  /** Для 409: клиент шлёт значение, которое читал. */
  @IsString()
  updated_at!: string;
}

export class UpdatePurchaseRequestEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => UpdatePurchaseRequestDto)
  body!: UpdatePurchaseRequestDto;
}

export class ReplaceIncomeContractDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_contract_id?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  income_stage_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  /** Для 409: клиент шлёт значение, которое читал. */
  @IsString()
  updated_at!: string;
}

export class ReplaceIncomeContractEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ReplaceIncomeContractDto)
  body!: ReplaceIncomeContractDto;
}

export class AssignPurchaseRequestLeadDto {
  @IsUUID()
  employee_id!: string;

  /** Для 409: клиент шлёт значение, которое читал. */
  @IsString()
  updated_at!: string;
}

export class AssignPurchaseRequestLeadEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => AssignPurchaseRequestLeadDto)
  body!: AssignPurchaseRequestLeadDto;
}

export class AddPurchaseRequestSupplierDto {
  @IsUUID()
  partner_id!: string;

  /** Для 409: клиент шлёт значение, которое читал. */
  @IsString()
  updated_at!: string;
}

export class AddPurchaseRequestSupplierEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => AddPurchaseRequestSupplierDto)
  body!: AddPurchaseRequestSupplierDto;
}
