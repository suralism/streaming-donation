import { NextResponse } from 'next/server';
import db from '@/src/database';

export const dynamic = 'force-dynamic';

export async function POST(request: any) {
  try {
    const body = await request.json();
    const { userId, status, reason } = body; // status: 'approved' or 'rejected'

    if (!userId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    await db.updateUserKyc(userId, {
      kycStatus: status,
      kycDocumentUrl: user.kyc_document_url,
      kycRejectionReason: reason || null,
      bankName: user.bank_name,
      bankAccountNumber: user.bank_account_number,
      bankAccountHolder: user.bank_account_holder
    });

    return NextResponse.json({
      success: true,
      message: `ยืนยันผลการตรวจเอกสาร KYC เรียบร้อย: ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
