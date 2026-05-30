import { NextResponse } from 'next/server';
import sseRegistry from '@/src/sseRegistry';
import db from '@/src/database';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { donor, amount, message } = body;

    const testTxId = `test-alert-${Date.now()}`;

    const alertData = {
      type: 'donation',
      id: testTxId,
      donor: donor || 'ผู้ทดสอบ',
      amount: amount || 100,
      message: message || 'นี่คือ test alert 🎉',
      status: 'successful',
      timestamp: new Date().toISOString()
    };

    console.log(`📢 Emitting test alert for: ${alertData.donor}, Amount: ${alertData.amount}`);
    sseRegistry.emit('alert', alertData);

    // บันทึกลง Database เป็น ID พิเศษเพื่อให้ระบบ Polling สามารถดึงไปแสดงผลบน OBS ได้ร้อยเปอร์เซ็นต์ในทุก Process
    await db.saveTransaction({
      id: testTxId,
      amount: alertData.amount,
      donor: alertData.donor,
      message: alertData.message,
      status: 'successful',
      paidAt: alertData.timestamp
    });

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
