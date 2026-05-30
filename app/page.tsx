'use client';

import { useState } from 'react';

export default function DonationPage() {
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const presets = [
    { amount: 50, emoji: '☕', label: '฿50', desc: 'ค่าน้ำเก๊กฮวย' },
    { amount: 100, emoji: '🍰', label: '฿100', desc: 'ค่าขนมเค้ก' },
    { amount: 200, emoji: '🍔', label: '฿200', desc: 'ค่าน้ำชาบู' },
    { amount: 500, emoji: '🚀', label: '฿500', desc: 'สนับสนุนเซิร์ฟเวอร์' },
  ];

  const handlePresetSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setSelectedAmount(val);
    setCustomAmount(e.target.value);
  };

  const isButtonDisabled = selectedAmount < 1 || loading;

  const getButtonText = () => {
    if (loading) return loadingText || 'กำลังดำเนินการ...';
    if (selectedAmount >= 1) return `ส่งกำลังใจ ฿${selectedAmount.toLocaleString()}`;
    return 'ดำเนินการต่อ';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAmount < 1) return;

    setLoading(true);
    setLoadingText('กำลังสร้างรายการโอน...');

    try {
      const res = await fetch('/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedAmount,
          name: donorName,
          message: donorMessage
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างลิงก์ชำระเงิน');
      }

      if (data.paymentUrl) {
        setLoadingText('กำลังพาท่านไปหน้าชำระเงิน...');
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('ไม่ได้รับลิงก์ชำระเงินจากเซิร์ฟเวอร์');
      }
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Glowing Background Blur Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <div className="container">
        <div className="step active">
          <form className="card glass-card" onSubmit={handleSubmit}>
            <div className="header">
              <div className="glowing-heart">💝</div>
              <h1>ส่งกำลังใจสนับสนุน</h1>
              <p className="subtitle">ร่วมสนับสนุนและส่งกำลังใจให้พวกเราพัฒนาผลงานต่อไป ✨</p>
            </div>

            {/* Preset options */}
            <div className="amount-options">
              {presets.map((p) => (
                <button
                  key={p.amount}
                  type="button"
                  className={`amount-btn ${selectedAmount === p.amount && !customAmount ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(p.amount)}
                >
                  <span className="amount-emoji">{p.emoji}</span>
                  <span className="amount-val">{p.label}</span>
                  <span className="amount-desc">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="custom-amount">
              <label htmlFor="customAmount">หรือระบุจำนวนเงินด้วยตนเอง</label>
              <div className="input-group">
                <span className="currency">฿</span>
                <input
                  id="customAmount"
                  type="number"
                  placeholder="ระบุจำนวนเงิน..."
                  min="1"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />
              </div>
            </div>

            {/* Donor info */}
            <div className="donor-info">
              <label htmlFor="donorName">ชื่อผู้ส่งกำลังใจ (จะโชว์บนหน้าจอสตรีม)</label>
              <input
                id="donorName"
                type="text"
                placeholder="ระบุชื่อของคุณ (เช่น น้องเป็ดใจดี)..."
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />

              <label htmlFor="donorMessage">ข้อความของคุณ (จะถูกอ่านออกเสียงโดย AI)</label>
              <textarea
                id="donorMessage"
                placeholder="ฝากข้อความถึงเราที่นี่..."
                rows={2}
                value={donorMessage}
                onChange={(e) => setDonorMessage(e.target.value)}
              />
            </div>

            <button
              id="btnDonate"
              type="submit"
              className="btn-primary"
              disabled={isButtonDisabled}
            >
              {getButtonText()}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
