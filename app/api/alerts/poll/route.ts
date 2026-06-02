import { NextResponse } from 'next/server';
import db from '@/src/database';
import { getTestAlerts } from '@/app/api/alerts/test/route';

export const dynamic = 'force-dynamic';

export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'system';

    // ดึงธุรกรรมจริงจาก DB (ไม่รวม test alerts)
    const transactions = await db.getTransactions(true);
    
    // ดึง test alerts จาก in-memory store
    const testAlerts = getTestAlerts();

    // รวมรายการทั้งหมด
    const allAlerts = [...transactions, ...testAlerts];
    
    // กรองเอาเฉพาะรายการที่สำเร็จ (successful) ย้อนหลังไม่เกิน 60 วินาที และตรงกับ creator_id เพื่อประหยัด Bandwidth
    const now = Date.now();
    const activeAlerts = allAlerts.filter((tx: any) => {
      if (tx.status !== 'successful') return false;
      if ((tx.creator_id || 'system') !== userId) return false;
      const paidTime = tx.paidAt ? new Date(tx.paidAt).getTime() : 0;
      return now - paidTime < 60000; // 60 วินาทีล่าสุด
    });

    return NextResponse.json({
      success: true,
      alerts: activeAlerts
    });
  } catch (error: any) {
    console.error('Poll alerts error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
