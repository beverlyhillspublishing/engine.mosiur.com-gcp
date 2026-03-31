import nodemailer from 'nodemailer';
import { BaseEmailProvider, SendEmailOptions, SendEmailResult } from './base.provider';

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export class SmtpProvider extends BaseEmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${options.fromName}" <${options.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        headers: options.headers,
      });
      return { messageId: info.messageId, success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }
}
