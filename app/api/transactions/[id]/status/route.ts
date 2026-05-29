import { NextResponse } from 'next/server';
import db from '@/src/database';
import sseRegistry from '@/src/sseRegistry';

const { getTransactionById, saveTransaction } = db;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'successful', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    const tx = await getTransactionById(id);
    if (!tx) {
      return NextResponse.json({ error: 'ไม่พบธุรกรรมนี้' }, { status: 404 });
    }

    const updatedTx = await saveTransaction({
      id,
      status
    });

    // If status is updated to successful, trigger live test/manual alert
    if (status === 'successful') {
      const alertPayload = {
        type: 'donation',
        donor: updatedTx.donor || 'Anonymous',
        amount: updatedTx.amount || 0,
        message: updatedTx.message || '',
        timestamp: new Date().toISOString(),
        isManualTrigger: true
      };

      console.log(`📢 Emitting manual status success alert for: ${alertPayload.donor}, Amount: ${alertPayload.amount}`);
      sseRegistry.emit('alert', alertPayload);
    }

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถอัปเดตสถานะธุรกรรมได้',
      details: error.message
    }, { status: 500 });
  }
}
