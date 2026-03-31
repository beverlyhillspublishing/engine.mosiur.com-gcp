export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

export abstract class BaseEmailProvider {
  abstract send(options: SendEmailOptions): Promise<SendEmailResult>;
}
