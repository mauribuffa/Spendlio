import type { CategoryKey } from '@spendlio/contracts';
import type {
  CategorizeInput,
  ChatArgs,
  ChatResult,
  ChatStream,
  LLMProvider,
  ReceiptImage,
  ReceiptOcrResult,
} from '../provider';

/**
 * Untyped boundary to the live provider. Consumers of `@spendlio/ai` only ever
 * see the `LLMProvider` interface here — they never statically pull `./index`,
 * which imports the Vercel AI SDK's heavy generic surface
 * (`streamText`/`generateText`/`tool`). Without this seam, a consumer that
 * typechecks `@spendlio/ai` from source (api/worker via tsconfig paths) makes
 * `tsc` fully instantiate the `ai` generics — ~300s / OOM. With it, the live
 * module is loaded via a runtime `import()` whose specifier is a NON-LITERAL
 * value, so the type graph stops here (`tsc` types the import as `any`).
 *
 * `import()` is portable across the api (CommonJS) and worker (ESM) runtimes; the
 * module is cached after first load. `getProvider()` stays synchronous by
 * returning this proxy — each method awaits the real provider on first use. The
 * live path only runs when an API key is set, so the one-time dynamic import sits
 * on the slow LLM path anyway.
 */
let cached: Promise<LLMProvider> | undefined;

// Non-literal specifier: keeps tsc from resolving './index' into the type graph.
const LIVE_MODULE = './index';

function load(): Promise<LLMProvider> {
  cached ??= (import(LIVE_MODULE) as Promise<{ LiveProvider: new () => LLMProvider }>).then(
    (m) => new m.LiveProvider(),
  );
  return cached;
}

export class LazyLiveProvider implements LLMProvider {
  async categorize(input: CategorizeInput): Promise<CategoryKey | null> {
    return (await load()).categorize(input);
  }
  async extractReceipt(image: ReceiptImage): Promise<ReceiptOcrResult> {
    return (await load()).extractReceipt(image);
  }
  async chat(args: ChatArgs): Promise<ChatResult> {
    return (await load()).chat(args);
  }
  streamChat(args: ChatArgs): ChatStream {
    const streamPromise = load().then((p) => p.streamChat(args));
    return {
      textStream: deferredAsyncIterable(streamPromise),
      toUIMessageStreamResponse: () => deferredResponse(streamPromise),
      usedTools: async () => (await streamPromise).usedTools(),
    };
  }
}

/** Flatten a Promise<ChatStream> into its AsyncIterable<string>. */
async function* deferredAsyncIterable(p: Promise<ChatStream>): AsyncIterable<string> {
  const stream = await p;
  for await (const chunk of stream.textStream) yield chunk;
}

/** A Response whose body streams once the underlying provider stream resolves. */
function deferredResponse(p: Promise<ChatStream>): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const upstream = (await p).toUIMessageStreamResponse();
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
  });
}
