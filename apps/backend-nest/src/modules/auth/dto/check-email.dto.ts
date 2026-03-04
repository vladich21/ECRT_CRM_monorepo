import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckEmailDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;
}
