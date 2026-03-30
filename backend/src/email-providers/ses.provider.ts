import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { BaseEmailProvider, SendEmailOptions, SendEmailResult } from './base.provider';

export interface SesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class SesProvider extends BaseEmailProvider {
  private client: SESClient;

  constructor(config: SesConfig) {
    super();
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const cmd = new SendEmailCommand({
        Source: `"${options.fromName}" <${options.fromEmail}>`,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject },
          Body: {
            Html: { Data: options.html },
            ...(options.text && { Text: { Data: options.text } }),
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      });

      const result = await this.client.send(cmd);
      return { messageId: result.MessageId, success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }
}
