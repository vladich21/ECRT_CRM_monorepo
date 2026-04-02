import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class InitialSupplierEvaluationCriterionScoreInputDto {
  @IsUUID('4')
  criterion_id!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(1)
  @Max(5)
  score!: number;
}

export class CreateInitialSupplierEvaluationDto {
  @IsUUID('4')
  partner_id!: string;

  /** YYYY-MM-DD */
  @IsString()
  evaluated_at!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  /** Только включённые критерии (исключённые не передаются). */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InitialSupplierEvaluationCriterionScoreInputDto)
  scores!: InitialSupplierEvaluationCriterionScoreInputDto[];
}

/** Тело запроса как в остальных контроллерах: `{ body: { ... } }`. */
export class SupplierEvaluationsCreateInitialEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateInitialSupplierEvaluationDto)
  body!: CreateInitialSupplierEvaluationDto;
}

