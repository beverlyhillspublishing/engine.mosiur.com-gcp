import * as cheerio from 'cheerio';
import { prisma } from '../config/database';
import { config } from '../config';

export async function rewriteLinks(
  html: string,
  campaignId: string,
  sendId: string,
): Promise<string> {
  const $ = cheerio.load(html, { decodeEntities: false });
  const anchors = $('a[href]').toArray();

  for (const el of anchors) {
    const originalUrl = $(el).attr('href') || '';
    if (!originalUrl || originalUrl.startsWith('mailto:') || originalUrl.startsWith('#')) continue;

    const trackedLink = await prisma.trackedLink.create({
      data: { campaignId, sendId, originalUrl },
    });

    $(el).attr('href', `${config.trackingBaseUrl}/t/c/${trackedLink.token}`);
  }

  return $.html();
}

// Sync version for batch processing where links are pre-created
export function rewriteLinksSync(
  html: string,
  linkMap: Map<string, string>, // originalUrl → trackingUrl
): string {
  const $ = cheerio.load(html, { decodeEntities: false });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const tracked = linkMap.get(href);
    if (tracked) $(el).attr('href', tracked);
  });

  return $.html();
}
