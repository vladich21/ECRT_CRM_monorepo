import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
  return value === '' ? undefined : value;
}

export class SendPurchaseRequestToAgreementDto {
  @IsString()
  updated_at!: string;

  /** БП-35: без true при истекающем КП сервер отвечает 428. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsBoolean()
  confirm_expiring_quote?: boolean;
}

export class SendPurchaseRequestToAgreementEnvelopeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SendPurchaseRequestToAgreementDto)
  body!: SendPurchaseRequestToAgreementDto;
}
