import sseRegistry from '@/src/sseRegistry';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  const initialPayload = { type: 'connected', message: 'Overlay connected' };
  writer.write(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`));

  // Subscriber function
  const alertHandler = (data) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('SSE send error:', err);
    }
  };

  sseRegistry.on('alert', alertHandler);
  console.log(`🔗 SSE Client connected. Current active listeners: ${sseRegistry.listenerCount('alert')}`);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: keep-alive\n\n`));
    } catch (err) {
      // Stream might be closed already
    }
  }, 15000);

  // Cleanup on request abort/close
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    sseRegistry.off('alert', alertHandler);
    try {
      writer.close();
    } catch (e) {}
    console.log(`🔌 SSE Client disconnected. Current active listeners: ${sseRegistry.listenerCount('alert')}`);
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // bypass Nginx buffering
    }
  });
}
