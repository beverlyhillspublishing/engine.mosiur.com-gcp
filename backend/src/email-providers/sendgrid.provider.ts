import sgMail from '@sendgrid/mail';
import { BaseEmailProvider, SendEmailOptions, SendEmailResult } from './base.provider';

export interface SendGridConfig {
  apiKey: string;
}

export class SendGridProvider extends BaseEmailProvider {
  constructor(config: SendGridConfig) {
    super();
    sgMail.setApiKey(config.apiKey);
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const [response] = await sgMail.send({
        from: { email: options.fromEmail, name: options.fromName },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        headers: options.headers,
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
        },
      });
      return { messageId: response.headers['x-message-id'] as string, success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }
}
