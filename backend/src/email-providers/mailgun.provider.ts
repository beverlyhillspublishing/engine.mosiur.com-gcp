import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { BaseEmailProvider, SendEmailOptions, SendEmailResult } from './base.provider';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
}

export class MailgunProvider extends BaseEmailProvider {
  private mg: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private domain: string;

  constructor(config: MailgunConfig) {
    super();
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({ username: 'api', key: config.apiKey });
    this.domain = config.domain;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const result = await this.mg.messages.create(this.domain, {
        from: `${options.fromName} <${options.fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        'h:Reply-To': options.replyTo,
        'o:tracking': 'no',
        'o:tracking-clicks': 'no',
        'o:tracking-opens': 'no',
      });
      return { messageId: result.id, success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }
}
