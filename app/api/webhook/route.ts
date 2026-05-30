import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/src/database';
import sseRegistry from '@/src/sseRegistry';

const { getTransactionById, saveTransaction } = db;

export async function POST(request) {
  try {
    const signature = request.headers.get('x-beam-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // Read raw body as text for verification and parsing
    const rawBodyText = await request.text();
    const rawBodyBuffer = Buffer.from(rawBodyText, 'utf8');

    // 1. Verify Signature
    if (webhookSecret && signature) {
      const secretBuffer = Buffer.from(webhookSecret, 'base64');
      const hmac = crypto.createHmac('sha256', secretBuffer);
      const digest = hmac.update(rawBodyBuffer).digest('base64');

      if (signature !== digest) {
        console.error('Webhook signature mismatch!');
        console.error('Expected:', digest);
        console.error('Received:', signature);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (webhookSecret && !signature) {
      console.warn('Webhook received without signature, but secret is configured.');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBodyText);
    console.log('Webhook received:', event.type);

    const eventType = request.headers.get('x-beam-event') || event.type;

    if (eventType === 'charge.completed' || eventType === 'charge.succeeded' || event.status === 'SUCCEEDED') {
      const charge = event;
      const amount = charge.amount ? (charge.amount / 100) : 0;
      const chargeId = charge.chargeId || charge.id;
      const paymentLinkId = charge.sourceId;

      console.log(`✅ Payment successful: ${chargeId}, Amount: ${amount} THB (Link ID: ${paymentLinkId})`);

      // 1. Find existing transaction by Payment Link ID (first) or Charge ID (second)
      let tx = null;
      if (paymentLinkId) {
        tx = await getTransactionById(paymentLinkId);
      }
      if (!tx && chargeId) {
        tx = await getTransactionById(chargeId);
      }

      const targetId = tx ? tx.id : (paymentLinkId || chargeId);

      // 2. Update DB
      await saveTransaction({
        id: targetId,
        amount: amount || (tx ? tx.amount : 0),
        status: 'successful',
        paidAt: new Date().toISOString(),
        raw_webhook: event
      });

      // 3. Broadcast Alert via sseRegistry
      const txDetails = (await getTransactionById(targetId)) || {};
      const alertPayload = {
        type: 'donation',
        id: targetId,
        donor: txDetails.donor || 'Anonymous',
        amount: amount || txDetails.amount || 0,
        message: txDetails.message || charge.description || '',
        status: 'successful',
        timestamp: new Date().toISOString()
      };
      
      console.log(`📢 Emitting webhook alert for: ${alertPayload.donor}, Amount: ${alertPayload.amount}`);
      sseRegistry.emit('alert', alertPayload);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
