import { NextResponse } from 'next/server';
import db from '@/src/database';

const { getTransactions } = db;

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let transactions = await db.getTransactions(true);
    
    // Always exclude test alerts from transaction history
    transactions = transactions.filter((t: any) => !t.id?.startsWith('test-alert-'));
    
    if (userId) {
      // Filter by creator ID
      transactions = transactions.filter((t: any) => t.creator_id === userId);
    }
    
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({
      error: 'ไม่สามารถดึงข้อมูลรายการธุรกรรมได้',
      details: error.message
    }, { status: 500 });
  }
}
