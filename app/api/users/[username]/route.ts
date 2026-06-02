import { NextResponse } from 'next/server';
import db from '@/src/database';
import defaultSettings from '@/src/defaultSettings';

export const dynamic = 'force-dynamic';

export async function GET(request: any, { params }: { params: Promise<{ username: string }> }) {
  const unwrappedParams = await params;
  const username = unwrappedParams.username;
  try {
    const user = await db.getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    // Fetch user-specific settings
    const settings = await db.getSettings(defaultSettings, user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name || user.username,
        kycStatus: user.kyc_status
      },
      settings
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
