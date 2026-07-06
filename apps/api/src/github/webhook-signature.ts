import { createHmac, timingSafeEqual } from 'node:crypto';

// Verify GitHub's X-Hub-Signature-256 HMAC over the RAW request body
// (security.md §5). Constant-time comparison; any malformed input is a
// rejection, never an exception.
export function verifyWebhookSignature(
  secret: string,
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}
