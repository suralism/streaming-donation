import { NextResponse } from 'next/server';
import db from '@/src/database';

export const dynamic = 'force-dynamic';

export async function POST(request: any) {
  try {
    const body = await request.json();
    const { withdrawalId, status, adminNotes } = body; // status: 'approved' or 'rejected'

    if (!withdrawalId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // Get the withdrawal request
    // Since we don't have a direct getWithdrawalById, we can get all and filter, or just query.
    const withdrawals = await db.getWithdrawals();
    const w = withdrawals.find((x: any) => x.id === withdrawalId);
    if (!w) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการถอนเงินนี้ในระบบ' }, { status: 404 });
    }

    if (w.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'รายการนี้ได้รับการประมวลผลไปแล้ว' }, { status: 400 });
    }

    // Update status in DB
    await db.updateWithdrawalStatus(withdrawalId, status, adminNotes);

    // If rejected, refund the coins back to creator's balance
    if (status === 'rejected') {
      await db.updateUserBalance(w.user_id as string, w.coin_amount as number);
    }

    return NextResponse.json({
      success: true,
      message: `ประมวลผลรายการโอนเงินเสร็จสิ้น: ${status === 'approved' ? 'อนุมัติการโอนสำเร็จ' : 'ปฏิเสธและคืนหัวใจ'}`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
