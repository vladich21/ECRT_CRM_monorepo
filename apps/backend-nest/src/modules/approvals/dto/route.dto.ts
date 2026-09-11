import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ApprovalAssignmentType, ApprovalStepType } from '../types/approval.types';

const STEP_TYPES: ApprovalStepType[] = ['any', 'all', 'sequential'];
const ASSIGNMENT_TYPES: ApprovalAssignmentType[] = [
  'employee',
  'initiator_head',
  'department_head',
  'document_owner',
  'select_on_start',
  'owner_or_head',
];

export class RouteStepDto {
  @IsOptional()
  @IsInt()
  step_order?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(STEP_TYPES)
  step_type!: ApprovalStepType;

  @IsIn(ASSIGNMENT_TYPES)
  assignment_type!: ApprovalAssignmentType;

  @IsOptional()
  @IsUUID()
  step_role_id?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignee_ids?: string[];

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsBoolean()
  can_delegate?: boolean;

  @IsOptional()
  @IsBoolean()
  can_return_to_previous?: boolean;

  @IsOptional()
  @IsInt()
  time_limit_hours?: number;
}

export class CreateRouteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  entity_type_id!: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  on_complete_actions?: unknown[];
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  entity_type_id?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  on_complete_actions?: unknown[];
}

export class ReplaceStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStepDto)
  steps!: RouteStepDto[];
}
