import { NextResponse } from 'next/server';
import db from '@/src/database';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const body = await request.json();
    const { username, email, displayName, password } = body;
    if (!username || !email) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    
    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return NextResponse.json({ success: false, error: 'Username ต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดกลางเท่านั้น' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.getUserByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username นี้ถูกใช้งานแล้ว' }, { status: 409 });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      email: email.trim(),
      displayName: displayName || username,
      passwordHash
    };

    await db.createUser(newUser);
    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, email: newUser.email, displayName: newUser.displayName } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
