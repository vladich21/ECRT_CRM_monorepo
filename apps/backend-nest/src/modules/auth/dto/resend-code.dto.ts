import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';

export class ResendCodeDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsIn(['temp-code', '2fa-code'], { message: 'Некорректный тип кода' })
  type: 'temp-code' | '2fa-code';
}
