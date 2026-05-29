import { NextResponse } from 'next/server';
import db from '@/src/database';

const { getTransactions } = db;

export async function GET() {
  try {
    const transactions = await getTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถดึงข้อมูลรายการธุรกรรมได้',
      details: error.message
    }, { status: 500 });
  }
}
