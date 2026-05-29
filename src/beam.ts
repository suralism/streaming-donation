import axios from 'axios';

const getAuthHeader = () => {
  const merchantId = process.env.BEAM_MERCHANT_ID;
  const apiKey = process.env.BEAM_API_KEY;
  if (!merchantId || !apiKey) {
    console.error('❌ Missing Beam Credentials: Check .env file');
  }
  const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');
  return `Basic ${credentials}`;
};

// สร้าง Axios instance
const beamApi = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// ใช้ Request Interceptor เพื่อให้ได้ค่าจาก .env ล่าสุดเสมอ ป้องกันปัญหา Cache หรือการโหลดล่าช้าตอน Hot-Reload
beamApi.interceptors.request.use((config) => {
  const env = process.env.BEAM_ENV || 'sandbox';
  config.baseURL = env === 'production'
    ? 'https://api.beamcheckout.com'
    : 'https://playground.api.beamcheckout.com';
    
  config.headers['Authorization'] = getAuthHeader();
  
  const merchantId = process.env.BEAM_MERCHANT_ID || 'undefined';
  const apiKey = process.env.BEAM_API_KEY || 'undefined';
  const maskedKey = apiKey !== 'undefined' ? apiKey.substring(0, 5) + '...' : 'undefined';
  console.log(`📡 [Beam Request] Env: ${env} | Merchant: ${merchantId} | Key: ${maskedKey} | URL: ${config.baseURL}${config.url}`);
  
  return config;
});

/**
 * สร้าง PromptPay Charge
 */
export async function createPromptPayCharge({ amount, currency = 'THB', description, metadata = {} }: { amount: number, currency?: string, description?: string, metadata?: any }) {
  const response = await beamApi.post('/api/charges', {
    amount,
    currency,
    description,
    paymentMethod: {
      paymentMethodType: 'QR_PROMPT_PAY',
      qrPromptPay: {}
    },
    metadata
  });

  return response.data;
}

/**
 * สร้าง Payment Link (ตามเอกสารล่าสุด)
 */
export async function createPaymentLink({ amount, currency = 'THB', description, referenceId, redirectUrl }: { amount: number, currency?: string, description?: string, referenceId?: string, redirectUrl?: string }) {
  const CARD_MIN_AMOUNT = 20000;
  const isCardEnabled = amount >= CARD_MIN_AMOUNT;

  const response = await beamApi.post('/api/v1/payment-links', {
    order: {
      currency,
      netAmount: amount, // หน่วย satang
      description,
      referenceId: referenceId || `order-${Date.now()}`
    },
    linkSettings: {
      qrPromptPay: { isEnabled: true },
      card: { isEnabled: isCardEnabled },
      mobileBanking: { isEnabled: true },
      eWallets: { isEnabled: true }
    },
    redirectUrl: redirectUrl || process.env.SITE_URL || 'http://localhost:3000/thank-you'
  });

  return response.data;
}

/**
 * ดึงข้อมูล Charge
 */
export async function getCharge(chargeId: string) {
  const response = await beamApi.get(`/api/v1/charges/${chargeId}`);
  return response.data;
}

/**
 * ดึงรายการ Charges
 */
export async function listCharges({ limit = 10, starting_after }: { limit?: number, starting_after?: string } = {}) {
  const params: any = { limit };
  if (starting_after) params.starting_after = starting_after;

  const response = await beamApi.get('/api/v1/charges', { params });
  return response.data;
}

const beam = {
  createPromptPayCharge,
  createPaymentLink,
  getCharge,
  listCharges
};

export default beam;
