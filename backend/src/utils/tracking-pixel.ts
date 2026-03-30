// 1x1 transparent GIF, base64 encoded
const PIXEL_B64 =
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const TRACKING_PIXEL_BUFFER = Buffer.from(PIXEL_B64, 'base64');

export const TRACKING_PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Content-Length': TRACKING_PIXEL_BUFFER.length.toString(),
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};
