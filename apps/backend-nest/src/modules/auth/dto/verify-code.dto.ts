import { IsEmail, IsNumberString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyCodeDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsNumberString({}, { message: 'Код должен состоять из цифр' })
  @Length(6, 6, { message: 'Код должен быть 6-значным' })
  code: string;
}
