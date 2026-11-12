import { z } from 'zod';
import { StoreError } from './live-config';
export async function readText(req: Request, maxBytes = 16000): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) throw new StoreError('Request body is required');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new StoreError('Request too large', 413);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (e) {
    if (e instanceof StoreError) throw e;
    throw new StoreError('Invalid JSON');
  }
}
export function apiError(error: unknown) {
  if (error instanceof StoreError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  if (error instanceof z.ZodError)
    return Response.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
  // Do not send connection strings, SQL errors or gateway details to clients.
  console.error('Store operation failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json(
    { error: 'The store is temporarily unavailable. Please try again.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function readJson(req: Request, maxBytes = 16000): Promise<unknown> {
  try {
    return JSON.parse(await readText(req, maxBytes));
  } catch (e) {
    if (e instanceof StoreError) throw e;
    throw new StoreError('Invalid JSON');
  }
}
