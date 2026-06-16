import { API_BASE } from '@/lib/config';
import { getApiToken } from '@/lib/auth-token';

// Same-origin proxy for the assistant chat. The browser's useChat hook POSTs
// here; this handler runs server-side, attaches the signed-in user's Bearer
// token (so it never reaches the client), and streams the API's response back.
// Pointing useChat at a same-origin route also sidesteps CORS.

export async function POST(req: Request): Promise<Response> {
  const token = await getApiToken();
  if (!token) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/assistant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body,
    });
  } catch {
    // API not running yet — degrade gracefully so the chat page doesn't crash.
    return Response.json(
      { error: 'assistant_unavailable', message: 'The assistant is not reachable right now.' },
      { status: 503 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
    },
  });
}
