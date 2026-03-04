import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', '192.0.2.12'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth:
        config.get<string>('SMTP_USER')
          ? {
              user: config.get<string>('SMTP_USER'),
              pass: config.get<string>('SMTP_PASSWORD'),
            }
          : undefined,
    });
  }

  async sendTempCode(to: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'pmdb@test.local');
    await this.transporter.sendMail({
      from,
      to,
      subject: 'Код для входа в портал',
      text: `Ваш код для первого входа: ${code}\n\nКод действителен 10 минут.`,
      html: `<p>Ваш код для первого входа: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Код действителен 10 минут.</p>`,
    });
    this.logger.log(`Временный код отправлен на ${to}`);
  }

  async send2faCode(to: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'pmdb@test.local');
    await this.transporter.sendMail({
      from,
      to,
      subject: 'Код подтверждения входа',
      text: `Ваш код двухфакторной аутентификации: ${code}\n\nКод действителен 10 минут.`,
      html: `<p>Ваш код подтверждения: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Код действителен 10 минут.</p>`,
    });
    this.logger.log(`2FA-код отправлен на ${to}`);
  }
}
