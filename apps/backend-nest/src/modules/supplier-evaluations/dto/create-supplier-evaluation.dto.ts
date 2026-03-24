import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class SupplierEvaluationCriterionScoreInputDto {
  @IsUUID('4')
  criterion_id!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(1)
  @Max(5)
  score!: number;
}

export class CreateSupplierEvaluationDto {
  @IsUUID('4')
  partner_id!: string;

  @IsUUID('4')
  project_id!: string;

  /** YYYY-MM-DD */
  @IsString()
  evaluated_at!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierEvaluationCriterionScoreInputDto)
  scores!: SupplierEvaluationCriterionScoreInputDto[];
}

/** Тело запроса как в остальных контроллерах: `{ body: { ... } }`. */
export class SupplierEvaluationsCreateEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateSupplierEvaluationDto)
  body!: CreateSupplierEvaluationDto;
}
