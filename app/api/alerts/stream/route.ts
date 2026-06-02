import sseRegistry from '@/src/sseRegistry';
import db from '@/src/database';
import defaultSettings from '@/src/defaultSettings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'system';

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  const initialPayload = { type: 'connected', message: 'Overlay connected' };
  writer.write(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`));

  // Keep track of sent transaction IDs to prevent duplicates
  const sentTxIds = new Set();
  let lastCheckedTime = new Date(Date.now() - 5000).toISOString();
  
  // Track settings changes dynamically
  let lastSettingsStr = '';
  try {
    const initSettings = await db.getSettings(defaultSettings, userId);
    lastSettingsStr = JSON.stringify(initSettings);
  } catch (e) {}

  // 1. In-memory Subscriber function (as a backup/real-time booster)
  const alertHandler = (data) => {
    try {
      if (data.type === 'settings_update') {
        if (data.userId && data.userId !== userId) return;
      }
      if (data.type === 'donation') {
        const txCreatorId = data.creator_id || data.creatorId || 'system';
        if (txCreatorId !== userId) return; // Ignore if not matching

        const txId = data.id || data.referenceId;
        if (txId) {
          if (sentTxIds.has(txId)) return; // skip duplicate
          sentTxIds.add(txId);
        }
      }
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('SSE send error:', err);
    }
  };

  sseRegistry.on('alert', alertHandler);
  console.log(`🔗 SSE Client connected for ${userId}. Current active listeners: ${sseRegistry.listenerCount('alert')}`);

  // 2. Database-backed polling to bridge separate Node.js processes/isolated threads in Next.js
  const dbPollInterval = setInterval(async () => {
    try {
      // Poll successful transactions
      const transactions = await db.getTransactions(true);
      const newSuccessfulTx = transactions.filter(
        (tx) => tx.status === 'successful' && tx.paidAt && tx.paidAt > lastCheckedTime && (tx.creator_id || 'system') === userId
      );

      // Sort chronological order
      newSuccessfulTx.sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

      for (const tx of newSuccessfulTx) {
        if (!sentTxIds.has(tx.id)) {
          sentTxIds.add(tx.id);
          
          const alertPayload = {
            type: 'donation',
            id: tx.id,
            donor: tx.donor || 'Anonymous',
            amount: Number(tx.amount) || 0,
            message: tx.message || '',
            status: 'successful',
            timestamp: tx.paidAt,
            creator_id: tx.creator_id
          };

          writer.write(encoder.encode(`data: ${JSON.stringify(alertPayload)}\n\n`));
          console.log(`📡 [SSE Poll] Pushed database alert for: ${alertPayload.donor}, Amount: ${alertPayload.amount} to creator: ${userId}`);
        }

        if (tx.paidAt && tx.paidAt > lastCheckedTime) {
          lastCheckedTime = tx.paidAt;
        }
      }
    } catch (err) {
      // Database might be busy or re-initializing
    }
  }, 2000);

  // Poll settings changes every 4 seconds
  let settingsPollCount = 0;
  const heartbeatInterval = setInterval(async () => {
    try {
      writer.write(encoder.encode(`: keep-alive\n\n`));
    } catch (err) {}

    // Check settings changes
    settingsPollCount++;
    if (settingsPollCount >= 2) {
      settingsPollCount = 0;
      try {
        const currentSettings = await db.getSettings(defaultSettings, userId);
        const currentSettingsStr = JSON.stringify(currentSettings);
        if (currentSettingsStr !== lastSettingsStr) {
          lastSettingsStr = currentSettingsStr;
          writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'settings_update', settings: currentSettings })}\n\n`));
          console.log(`📡 [SSE Poll] Sent live settings update to OBS for ${userId}`);
        }
      } catch (e) {}
    }
  }, 15000);

  // Cleanup on request abort/close
  request.signal.addEventListener('abort', () => {
    clearInterval(dbPollInterval);
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
      'X-Accel-Buffering': 'no', // bypass Nginx buffering
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Connection'
    }
  });
}
