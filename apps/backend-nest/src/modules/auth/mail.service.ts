import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ECRT_LOGO_SVG } from './assets/ecrt-logo-svg';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('SMTP_FROM', 'pmdb@test.local');
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', '192.0.2.12'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: config.get<string>('SMTP_USER')
        ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASSWORD') }
        : undefined,
    });
  }

  async sendTempCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Код для входа в портал',
      text: `Ваш код для первого входа: ${code}\n\nКод действителен 10 минут.`,
      html: `<p>Ваш код для первого входа: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Код действителен 10 минут.</p>`,
    });
  }

  async send2faCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Код подтверждения входа',
      text: `Ваш код двухфакторной аутентификации: ${code}\n\nКод действителен 10 минут.`,
      html: this.build2faEmailHtml(code),
    });
  }

  private build2faEmailHtml(code: string): string {
    const safeCode = this.escapeHtml(code);
    const year = new Date().getFullYear();
    return `
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Код подтверждения входа</title>
  </head>
  <body style="margin:0;padding:0;background:#e9ebef;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#e9ebef;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#f3f5f7;">
            <tr>
              <td style="background:#1f3f69;padding:16px 20px 16px 28px;border-bottom:1px solid #e21a1a;color:#ffffff;font-family:Arial,sans-serif;font-size:28px;line-height:1;">${ECRT_LOGO_SVG}</td>
              <td style="background:#1f3f69;padding:22px 28px 22px 0;border-bottom:1px solid #e21a1a;color:#ffffff;font-family:Arial,sans-serif;font-size:18px;line-height:1.35;word-break:break-word;">АО «Инжиниринговый центр железнодорожного транспорта»</td>
            </tr>

            <tr>
              <td colspan="2" style="padding:34px 48px 18px 48px;font-family:Arial,sans-serif;">
                <div style="color:#2f62a6;font-size:18px;letter-spacing:2px;font-weight:700;margin-bottom:22px;">ПОДТВЕРЖДЕНИЕ ВХОДА</div>
                <div style="font-size:28px;line-height:1.35;color:#3b4654;margin-bottom:24px;word-break:break-word;">Для завершения входа в PMDB введите код подтверждения:</div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px auto;">
                  <tr>
                    <td style="background:#d8deea;border:1px solid #c8d0df;padding:14px 26px;font-family:Arial,sans-serif;font-weight:700;font-size:42px;letter-spacing:8px;color:#1f3f69;text-align:center;">
                      ${safeCode}
                    </td>
                  </tr>
                </table>

                <div style="background:#d8deea;border:1px solid #c8d0df;padding:18px 22px;font-family:Arial,sans-serif;color:#7f8fa4;font-size:16px;line-height:1.5;">
                  Код действителен 10 минут. Если вы не запрашивали вход, проигнорируйте это письмо.
                </div>
              </td>
            </tr>

            <tr>
              <td colspan="2" style="padding:26px 48px 24px 48px;text-align:center;font-family:Arial,sans-serif;color:#9aa6b5;font-size:14px;line-height:1.5;">
                Это письмо отправлено автоматически с PMDB.
              </td>
            </tr>

            <tr>
              <td colspan="2" style="background:#1f3f69;padding:18px 24px;text-align:center;font-family:Arial,sans-serif;color:#ffffff;font-size:14px;">
                &copy; ${year} Все права защищены
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
