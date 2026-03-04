import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetPasswordDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(10, { message: 'Пароль должен быть не менее 10 символов' })
  password: string;

  @IsNotEmpty({ message: 'Подтверждение пароля обязательно' })
  confirmPassword: string;
}
