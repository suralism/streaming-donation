import { NextResponse } from 'next/server';
import beam from '@/src/beam';

const { getCharge } = beam;

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const charge = await getCharge(id);
    
    return NextResponse.json({
      id: charge.id,
      status: charge.status,
      amount: charge.amount / 100,
      paid: charge.status === 'successful'
    });
  } catch (error) {
    console.error('Get charge error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'ไม่สามารถเช็คสถานะได้' }, { status: 500 });
  }
}
