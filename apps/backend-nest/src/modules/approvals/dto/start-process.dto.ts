import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class StepAssigneeDto {
  @IsInt()
  step_order!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  employee_ids!: string[];
}

export class TaskAssigneeDto {
  @IsString()
  action_id!: string;

  @IsUUID()
  employee_id!: string;
}

export class StartProcessDto {
  @IsString()
  entity_type!: string;

  @IsUUID()
  entity_id!: string;

  @IsUUID()
  route_id!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepAssigneeDto)
  step_assignees?: StepAssigneeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssigneeDto)
  task_assignees?: TaskAssigneeDto[];
}
