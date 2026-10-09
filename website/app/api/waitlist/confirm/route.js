import { handleConfirm } from '../../../../lib/waitlist-server.js';

export const runtime = 'nodejs';

export async function POST(request) {
  return handleConfirm(request);
}
