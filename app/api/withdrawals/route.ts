import { NextResponse } from 'next/server';
import db from '@/src/database';

export const dynamic = 'force-dynamic';

// GET withdrawals history
export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const withdrawals = await db.getWithdrawals(userId || undefined);
    return NextResponse.json({ success: true, withdrawals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST submit a withdrawal request
export async function POST(request: any) {
  try {
    const body = await request.json();
    const { userId, coinAmount } = body;

    if (!userId || !coinAmount || Number(coinAmount) <= 0) {
      return NextResponse.json({ success: false, error: 'ระบุข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'ไม่พบชื่อผู้ใช้งานนี้' }, { status: 404 });
    }

    // 1. Verify KYC Status
    if (user.kyc_status !== 'approved') {
      return NextResponse.json({ 
        success: false, 
        error: 'บัญชีของคุณยังไม่ได้รับการอนุมัติ KYC โปรดยื่นเอกสารยืนยันตัวตนและรอแอดมินตรวจสอบ' 
      }, { status: 400 });
    }

    // 2. Verify Bank Details are set
    if (!user.bank_name || !user.bank_account_number || !user.bank_account_holder) {
      return NextResponse.json({ 
        success: false, 
        error: 'ข้อมูลบัญชีธนาคารของคุณไม่ครบถ้วน กรุณาตั้งค่าบัญชีก่อนกดถอนเงิน' 
      }, { status: 400 });
    }

    // 3. Verify Wallet Balance
    const coinsToWithdraw = Number(coinAmount);
    if (user.coin_balance < coinsToWithdraw) {
      return NextResponse.json({ 
        success: false, 
        error: `ยอดหัวใจคงเหลือใน Wallet ไม่เพียงพอ (ยอดหัวใจของคุณ: ${user.coin_balance} ดวง)` 
      }, { status: 400 });
    }

    // Payout details (1 coin = 1 baht)
    const platformFeePercent = 5; // 5% platform service fee
    const fee = (coinsToWithdraw * platformFeePercent) / 100;
    const payoutAmount = coinsToWithdraw - fee;
    const withdrawalId = `wdr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Save pending withdrawal request
    await db.createWithdrawal({
      id: withdrawalId,
      userId: userId,
      coinAmount: coinsToWithdraw,
      payoutAmount: payoutAmount
    });

    // Deduct coins immediately from wallet to lock them for withdrawal
    await db.updateUserBalance(userId, -coinsToWithdraw);

    return NextResponse.json({
      success: true,
      message: 'ยื่นคำขอถอนเงินสำเร็จ! กรุณารอแอดมินตรวจสอบความถูกต้องและดำเนินการโอนเงินจริง',
      withdrawal: {
        id: withdrawalId,
        coinAmount: coinsToWithdraw,
        payoutAmount: payoutAmount,
        status: 'pending'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
