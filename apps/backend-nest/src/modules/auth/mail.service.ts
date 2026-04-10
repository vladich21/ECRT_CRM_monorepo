import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const LOGO_BASE64 =
  'data:image/png;base64,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';

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
      html: this.buildCodeEmailHtml({
        heading: 'ПОДТВЕРЖДЕНИЕ ВХОДА',
        description: 'Для завершения входа в PMDB введите код подтверждения:',
        code,
      }),
    });
  }

  async send2faCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Код подтверждения входа',
      text: `Ваш код двухфакторной аутентификации: ${code}\n\nКод действителен 10 минут.`,
      html: this.buildCodeEmailHtml({
        heading: 'ПОДТВЕРЖДЕНИЕ ВХОДА',
        description: 'Для завершения входа в PMDB введите код подтверждения:',
        code,
      }),
    });
  }

  private buildCodeEmailHtml({
    heading,
    description,
    code,
  }: {
    heading: string;
    description: string;
    code: string;
  }): string {
    const safeCode = this.escapeHtml(code);
    const safeHeading = this.escapeHtml(heading);
    const safeDescription = this.escapeHtml(description);
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;">
            <tr>
              <td bgcolor="#1C3A5E" style="background:#1C3A5E;border-radius:4px 4px 0 0;padding:20px 48px;">
                <table border="0" cellspacing="0" cellpadding="0" role="presentation">
                  <tr valign="middle">
                    <td style="padding-right:12px;">
                      <img src="${LOGO_BASE64}" width="34" height="34" alt=""
                        style="display:block;width:34px;height:34px;border:0;outline:none;text-decoration:none;" />
                    </td>
                    <td>
                      <p style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;letter-spacing:0.02em;margin:0;white-space:nowrap;">
                        АО &laquo;Инжиниринговый центр железнодорожного транспорта&raquo;
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#C0392B" height="3" style="background:#C0392B;font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <tr>
              <td style="background:#ffffff;padding:34px 48px 18px 48px;font-family:Arial,sans-serif;">
                <div style="color:#2f62a6;font-size:18px;letter-spacing:2px;font-weight:700;margin-bottom:22px;">${safeHeading}</div>
                <div style="font-size:20px;line-height:1.35;color:#3b4654;margin-bottom:24px;word-break:break-word;">${safeDescription}</div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px auto;">
                  <tr>
                    <td style="background:#d8deea;border:1px solid #c8d0df;padding:14px 26px;font-family:Arial,sans-serif;font-weight:700;font-size:42px;letter-spacing:8px;color:#1f3f69;text-align:center;">
                      ${safeCode}
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#d8deea;border:1px solid #c8d0df;">
                  <tr>
                    <td style="padding:18px 22px;font-family:Arial,sans-serif;color:#7f8fa4;font-size:16px;line-height:1.5;">
                      Код действителен 10 минут. Если вы не запрашивали вход, проигнорируйте это письмо.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;padding:26px 48px 24px 48px;text-align:center;font-family:Arial,sans-serif;color:#9aa6b5;font-size:14px;line-height:1.5;">
                Это письмо отправлено автоматически с PMDB.
              </td>
            </tr>

            <tr>
              <td style="background:#1C3A5E;padding:18px 24px;text-align:center;font-family:Arial,sans-serif;color:#ffffff;font-size:14px;border-radius:0 0 4px 4px;">
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
