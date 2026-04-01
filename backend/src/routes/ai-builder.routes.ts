import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as aiService from '../services/ai-builder.service';
import * as inboundService from '../services/inbound-email.service';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Generation endpoints ─────────────────────────────────────────────────────

router.post('/generate', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, prompt, url } = req.body;
    let imageBase64: string | undefined;
    let mimeType: string | undefined;

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    }

    let html: string;

    switch (source) {
      case 'prompt': {
        if (!prompt) throw new AppError(400, 'prompt is required');
        let brand;
        if (req.body.brandUrl) {
          brand = await aiService.extractBrand(req.body.brandUrl);
        }
        html = await aiService.generateFromPrompt(prompt, brand);
        break;
      }
      case 'url': {
        if (!url) throw new AppError(400, 'url is required');
        html = await aiService.generateFromUrl(url);
        break;
      }
      case 'website': {
        if (!url) throw new AppError(400, 'url is required');
        const brand = await aiService.extractBrand(url);
        html = await aiService.generateFromPrompt(prompt || `Create a professional email for ${brand.companyName}`, brand);
        break;
      }
      case 'screenshot': {
        if (!imageBase64 || !mimeType) throw new AppError(400, 'image is required');
        html = await aiService.generateFromScreenshot(imageBase64, mimeType);
        break;
      }
      default:
        throw new AppError(400, `Unknown source: ${source}`);
    }

    res.json({ html });
  } catch (e) { next(e); }
});

router.post('/fetch-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url) throw new AppError(400, 'url is required');
    res.json(await aiService.fetchUrlProxy(url));
  } catch (e) { next(e); }
});

router.post('/extract-brand', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url) throw new AppError(400, 'url is required');
    res.json(await aiService.extractBrand(url));
  } catch (e) { next(e); }
});

// ─── Inbox (Forward-to-Import) ────────────────────────────────────────────────

router.post('/inbox/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await inboundService.createInbox(req.params.orgId));
  } catch (e) { next(e); }
});

router.get('/inbox/:id/poll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await inboundService.pollInbox(req.params.id));
  } catch (e) { next(e); }
});

export default router;
