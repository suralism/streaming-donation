import { NextResponse } from 'next/server';
import db from '@/src/database';
import defaultSettings from '@/src/defaultSettings';
import sseRegistry from '@/src/sseRegistry';

const { getSettings, saveSettings } = db;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const settings = await getSettings(defaultSettings, userId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถดึงการตั้งค่าได้',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const body = await request.json();
    const newSettings = { ...defaultSettings, ...body };
    const savedSettings = await saveSettings(newSettings, userId);

    // Emit live settings update to active overlays
    sseRegistry.emit('alert', {
      type: 'settings_update',
      settings: savedSettings,
      userId: userId || 'system'
    });

    return NextResponse.json({ success: true, settings: savedSettings });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถบันทึกการตั้งค่าได้',
      details: error.message
    }, { status: 500 });
  }
}
