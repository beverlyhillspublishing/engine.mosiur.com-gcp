import Handlebars from 'handlebars';
import { config } from '../config';

export interface EmailRenderContext {
  firstName?: string;
  lastName?: string;
  email?: string;
  unsubscribeUrl?: string;
  organizationName?: string;
  [key: string]: unknown;
}

Handlebars.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

export function renderEmailHtml(template: string, context: EmailRenderContext): string {
  try {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  } catch (err) {
    return template; // Return raw if compilation fails
  }
}

export function renderEmailText(template: string, context: EmailRenderContext): string {
  try {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  } catch {
    return template;
  }
}

export function buildEmailContext(
  contact: { firstName?: string | null; lastName?: string | null; email: string; id: string },
  orgName: string,
  orgId: string,
  extra: Record<string, unknown> = {},
): EmailRenderContext {
  const { generateUnsubscribeToken } = require('./token');
  const token = generateUnsubscribeToken(contact.id, orgId);
  return {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email,
    unsubscribeUrl: `${config.apiUrl}/unsub/${token}`,
    organizationName: orgName,
    currentYear: new Date().getFullYear(),
    ...extra,
  };
}
