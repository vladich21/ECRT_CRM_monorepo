import { Transform, Type } from 'class-transformer';
import { IsDefined, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

import { PURCHASE_ROUTE_KINDS } from '../domain/purchase-request.route';

function emptyToNull({ value }: { value: unknown }) {
  return value === '' ? null : value;
}

export class ChoosePurchaseRouteDto {
  @IsIn(PURCHASE_ROUTE_KINDS)
  kind!: (typeof PURCHASE_ROUTE_KINDS)[number];

  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  base_contract_id?: string | null;

  @IsString()
  updated_at!: string;
}

export class ChoosePurchaseRouteEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ChoosePurchaseRouteDto)
  body!: ChoosePurchaseRouteDto;
}
