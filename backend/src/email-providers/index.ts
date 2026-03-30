import { EmailProvider } from '@prisma/client';
import { decrypt } from '../utils/hash';
import { BaseEmailProvider } from './base.provider';
import { SmtpProvider } from './smtp.provider';
import { SendGridProvider } from './sendgrid.provider';
import { SesProvider } from './ses.provider';
import { MailgunProvider } from './mailgun.provider';

export function getEmailProvider(provider: EmailProvider, encryptedConfig: string): BaseEmailProvider {
  const config = JSON.parse(decrypt(encryptedConfig));

  switch (provider) {
    case 'SMTP':
      return new SmtpProvider(config);
    case 'SENDGRID':
      return new SendGridProvider(config);
    case 'SES':
      return new SesProvider(config);
    case 'MAILGUN':
      return new MailgunProvider(config);
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}

export { BaseEmailProvider };
