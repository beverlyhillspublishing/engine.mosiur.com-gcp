import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const client = new Anthropic({ apiKey: config.ai?.anthropicKey });

const SYSTEM_PROMPT = `You are an expert email designer creating responsive HTML emails.
Rules:
- Output ONLY valid HTML between <html-email> and </html-email> tags
- Use inline CSS only (no <style> blocks, no <script> tags)
- Max-width 600px, centered, mobile responsive using max-width on a wrapper table or div
- Include Handlebars merge tags where appropriate: {{firstName}}, {{unsubscribeUrl}}
- Use a professional, clean layout with clear CTA buttons
- Buttons should use inline padding and background colors
- Never include JavaScript`;

interface BrandInfo {
  companyName?: string;
  primaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  colors: string[];
}

function extractHtml(claudeResponse: string): string {
  const match = claudeResponse.match(/<html-email>([\s\S]*?)<\/html-email>/i);
  if (!match) {
    // Try to find raw <html> block
    const htmlMatch = claudeResponse.match(/(<html[\s\S]*<\/html>)/i);
    if (htmlMatch) return htmlMatch[1].trim();
    throw new AppError(500, 'AI did not return valid HTML. Please try again.');
  }
  return match[1].trim();
}

// ─── SSRF protection ──────────────────────────────────────────────────────────

function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError(400, 'Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(400, 'Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
    throw new AppError(400, 'Private URLs are not allowed');
  }

  // Block private IP ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 169 // link-local
    ) {
      throw new AppError(400, 'Private URLs are not allowed');
    }
  }

  return parsed;
}

// ─── URL Proxy ────────────────────────────────────────────────────────────────

export async function fetchUrlProxy(rawUrl: string): Promise<{ html: string; title: string; faviconUrl?: string }> {
  const parsed = validateUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TechyPark/1.0)' },
      signal: controller.signal,
    });

    if (!response.ok) throw new AppError(400, `Failed to fetch URL: ${response.status}`);

    let html = await response.text();

    // Limit size
    if (html.length > 512_000) html = html.slice(0, 512_000);

    // Strip scripts
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Rewrite relative URLs to absolute
    const base = `${parsed.protocol}//${parsed.host}`;
    html = html.replace(/(href|src|action)=["'](?!https?:|\/\/|data:|mailto:|#)(\/?)([^"']*)/gi, (_, attr, slash, rest) => {
      const abs = slash ? `${base}/${rest}` : `${base}/${parsed.pathname.split('/').slice(0, -1).join('/')}/${rest}`;
      return `${attr}="${abs}"`;
    });

    // Extract title and favicon
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || parsed.hostname;
    const faviconHref = $('link[rel~="icon"]').attr('href');
    const faviconUrl = faviconHref ? new URL(faviconHref, parsed.toString()).toString() : `${base}/favicon.ico`;

    return { html, title, faviconUrl };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Brand Extraction ─────────────────────────────────────────────────────────

export async function extractBrand(rawUrl: string): Promise<BrandInfo> {
  const { html } = await fetchUrlProxy(rawUrl);
  const $ = cheerio.load(html);

  const companyName =
    $('meta[property="og:site_name"]').attr('content') ||
    $('meta[name="application-name"]').attr('content') ||
    $('title').first().text().trim().split('|')[0].trim() ||
    new URL(rawUrl).hostname;

  const logoUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('link[rel~="icon"]').attr('href') ||
    undefined;

  const primaryColor =
    $('meta[name="theme-color"]').attr('content') ||
    $('meta[name="msapplication-TileColor"]').attr('content') ||
    undefined;

  // Extract hex colors from inline styles and style tags
  const colors: string[] = [];
  const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

  $('style').each((_, el) => {
    const css = $(el).text();
    let m;
    while ((m = hexPattern.exec(css)) !== null) {
      const hex = m[0].toLowerCase();
      if (!['#ffffff', '#000000', '#fff', '#000'].includes(hex) && !colors.includes(hex)) {
        colors.push(hex);
      }
    }
  });

  const fontFamily = ((): string | undefined => {
    const bodyStyle = $('body').attr('style') || '';
    const ff = bodyStyle.match(/font-family:\s*([^;]+)/i);
    return ff ? ff[1].trim() : undefined;
  })();

  return {
    companyName,
    primaryColor: primaryColor || colors[0],
    fontFamily,
    logoUrl,
    colors: colors.slice(0, 5),
  };
}

// ─── Generate from Prompt ─────────────────────────────────────────────────────

export async function generateFromPrompt(prompt: string, brand?: BrandInfo): Promise<string> {
  const brandContext = brand
    ? `\n\nBrand context:\n- Company: ${brand.companyName || 'Unknown'}\n- Primary color: ${brand.primaryColor || '#3b82f6'}\n- Font: ${brand.fontFamily || 'Arial, sans-serif'}\n- Logo URL: ${brand.logoUrl || ''}`
    : '';

  const response = await client.messages.create({
    model: config.ai?.model || 'claude-sonnet-4-6',
    max_tokens: config.ai?.maxTokens || 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Create a responsive HTML email based on this description:

${prompt}${brandContext}

Return only the HTML between <html-email> and </html-email> tags.`,
      },
    ],
  });

  const text = response.content.find((c) => c.type === 'text')?.text || '';
  return extractHtml(text);
}

// ─── Generate from URL content ────────────────────────────────────────────────

export async function generateFromUrl(rawUrl: string): Promise<string> {
  const { html, title } = await fetchUrlProxy(rawUrl);
  const $ = cheerio.load(html);

  // Extract key content
  const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get().slice(0, 10).join('\n');
  const paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter((t) => t.length > 20).slice(0, 5).join('\n').slice(0, 2000);
  const images = $('img[src]').map((_, el) => $(el).attr('src')).get().slice(0, 3).join(', ');

  const response = await client.messages.create({
    model: config.ai?.model || 'claude-sonnet-4-6',
    max_tokens: config.ai?.maxTokens || 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Create a promotional email based on this website content:

Title: ${title}
Headings: ${headings}
Content: ${paragraphs}
Images: ${images}

Return only the HTML between <html-email> and </html-email> tags.`,
      },
    ],
  });

  const text = response.content.find((c) => c.type === 'text')?.text || '';
  return extractHtml(text);
}

// ─── Generate from Screenshot ─────────────────────────────────────────────────

export async function generateFromScreenshot(imageBase64: string, mimeType: string): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
    throw new AppError(400, 'Unsupported image type');
  }

  const response = await client.messages.create({
    model: config.ai?.model || 'claude-sonnet-4-6',
    max_tokens: config.ai?.maxTokens || 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'This is a screenshot of an email or website. Recreate it as a responsive HTML email that looks similar. Return only the HTML between <html-email> and </html-email> tags.',
          },
        ],
      },
    ],
  });

  const text = response.content.find((c) => c.type === 'text')?.text || '';
  return extractHtml(text);
}
