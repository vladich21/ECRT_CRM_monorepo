import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyPasswordDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;
}
