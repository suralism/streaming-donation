import { NextResponse } from 'next/server';
import sseRegistry from '@/src/sseRegistry';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { donor, amount, message } = body;

    const alertData = {
      type: 'donation',
      donor: donor || 'ผู้ทดสอบ',
      amount: amount || 100,
      message: message || 'นี่คือ test alert 🎉',
      timestamp: new Date().toISOString()
    };

    console.log(`📢 Emitting test alert for: ${alertData.donor}, Amount: ${alertData.amount}`);
    sseRegistry.emit('alert', alertData);

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
