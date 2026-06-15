import { API_BASE, DEMO_USER_ID } from '../../../lib/config';

// Same-origin proxy for the assistant chat. The browser's useChat hook POSTs
// here; this handler runs server-side, injects the dev x-user-id header (so it
// never reaches the client), and streams the API's response back. Pointing
// useChat at a same-origin route also sidesteps CORS.
//
// The API (POST /api/assistant) validates the body (AssistantChatRequest) and
// returns an AI-SDK UI-message stream via
// streamAssistant(...).toUIMessageStreamResponse().

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/assistant`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': DEMO_USER_ID,
      },
      body,
    });
  } catch {
    // API not running yet — degrade gracefully so the chat page doesn't crash.
    return Response.json(
      { error: 'assistant_unavailable', message: 'The assistant is not reachable right now.' },
      { status: 503 },
    );
  }

  // Stream the upstream body (and its content-type) through unchanged.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
    },
  });
}
