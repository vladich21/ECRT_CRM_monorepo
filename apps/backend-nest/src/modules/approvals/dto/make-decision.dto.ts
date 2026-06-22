import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import type { ApprovalDecisionType, DelegationMode } from '../types/approval.types';

const DECISION_TYPES: ApprovalDecisionType[] = [
  'approved',
  'rejected',
  'returned_to_step',
  'returned_to_initiator',
  'delegated',
];

export class MakeDecisionDto {
  @IsIn(DECISION_TYPES)
  decision_type!: ApprovalDecisionType;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  delegated_to?: string;

  @IsOptional()
  @IsIn(['transfer', 'add'])
  delegation_mode?: DelegationMode;

  @IsOptional()
  @IsInt()
  return_to_step?: number;
}

export class ResubmitDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
