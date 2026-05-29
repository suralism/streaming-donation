import { NextResponse } from 'next/server';
import beam from '@/src/beam';
import db from '@/src/database';

const { saveTransaction } = db;
const { createPaymentLink } = beam;

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, name, message } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'จำนวนเงินไม่ถูกต้อง' }, { status: 400 });
    }

    // Determine redirect URL based on request headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUrl = `${protocol}://${host}/thank-you`;

    // Create payment link using Beam API
    const charge = await createPaymentLink({
      amount: Math.round(amount * 100), // convert to satang
      currency: 'THB',
      description: message || `Donation from ${name || 'Anonymous'}`,
      referenceId: `donate-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      redirectUrl: redirectUrl
    });

    // Save transaction to Turso/SQLite as pending
    await saveTransaction({
      id: charge.paymentLinkId || charge.id,
      amount: amount,
      donor: name || 'Anonymous',
      message: message || '',
      status: 'pending',
      paymentUrl: charge.url,
      raw_response: charge
    });

    return NextResponse.json({
      success: true,
      paymentUrl: charge.url
    });

  } catch (error) {
    console.error('❌ Create payment link failed!');
    let errorMessage = error.message;
    let details = '';

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      details = error.response.data?.message || '';
    } else {
      console.error('Error Message:', error.message);
    }

    return NextResponse.json({
      error: 'ไม่สามารถสร้างรายการบริจาคได้',
      details: details || errorMessage
    }, { status: 500 });
  }
}
