import { NextResponse } from 'next/server';
import db from '@/src/database';

export const dynamic = 'force-dynamic';

export async function POST(request: any) {
  try {
    const body = await request.json();
    const { userId, bankName, bankAccountNumber, bankAccountHolder, kycDocumentUrl } = body;

    if (!userId || !bankName || !bankAccountNumber || !bankAccountHolder) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลบัญชีธนาคารให้ครบถ้วน' }, { status: 400 });
    }

    await db.updateUserKyc(userId, {
      kycStatus: 'pending', // ตั้งสถานะเป็นรอการตรวจสอบ
      kycDocumentUrl: kycDocumentUrl || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500', // default mockup link
      bankName,
      bankAccountNumber,
      bankAccountHolder
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งเอกสารยืนยันตัวตน KYC สำเร็จ! ขณะนี้กำลังอยู่ระหว่างการรอตรวจสอบข้อมูลจากเจ้าหน้าที่'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
