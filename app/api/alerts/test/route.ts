import { NextResponse } from 'next/server';
import sseRegistry from '@/src/sseRegistry';

// In-memory store for test alerts (polling fallback only, NOT saved to DB)
// Kept for max 60 seconds so overlay poll can pick them up
const testAlertStore: any[] = [];

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { donor, amount, message, creatorId } = body;

    const testTxId = `test-alert-${Date.now()}`;

    const alertData = {
      type: 'donation',
      id: testTxId,
      donor: donor || 'ผู้ทดสอบ',
      amount: amount || 100,
      message: message || 'นี่คือ test alert 🎉',
      status: 'successful',
      timestamp: new Date().toISOString(),
      creatorId: creatorId || 'system',
      isTest: true
    };

    console.log(`📢 Emitting test alert for: ${alertData.donor}, Amount: ${alertData.amount}, Creator: ${alertData.creatorId}`);
    sseRegistry.emit('alert', alertData);

    // Store in memory (NOT database) for polling fallback
    testAlertStore.push({
      ...alertData,
      paidAt: alertData.timestamp,
      creator_id: alertData.creatorId
    });

    // Auto-cleanup: remove test alerts older than 60s
    const now = Date.now();
    while (testAlertStore.length > 0 && now - new Date(testAlertStore[0].paidAt).getTime() > 60000) {
      testAlertStore.shift();
    }

    return NextResponse.json({
      success: true,
      alert: alertData
    });
  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถส่งข้อความทดสอบได้',
      details: error.message
    }, { status: 500 });
  }
}

// Export test alert store for polling route to access
export function getTestAlerts() {
  const now = Date.now();
  return testAlertStore.filter((a) => now - new Date(a.paidAt).getTime() < 60000);
}
