'use client';

import React, { useState, useEffect } from 'react';
import '@/app/globals.css';

export default function CreatorDonationPage({ params }: { params: Promise<{ username: string }> }) {
  const unwrappedParams = React.use(params);
  const username = unwrappedParams.username;
  
  const [creator, setCreator] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  useEffect(() => {
    const fetchCreatorDetails = async () => {
      try {
        const res = await fetch(`/api/users/${username}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
        const data = await res.json();
        setCreator(data.user);
        setSettings(data.settings);
        
        // Dynamically apply primary/secondary colors from settings if custom colors are configured
        if (data.settings) {
          const doc = document.documentElement;
          doc.style.setProperty('--primary-color', data.settings.primaryColor || '#6366f1');
          doc.style.setProperty('--secondary-color', data.settings.secondaryColor || '#a855f7');
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    };
    fetchCreatorDetails();
  }, [username]);

  const presets = [
    { amount: 50, label: '50 ดวง', desc: 'ส่งหัวใจ 50 ดวง' },
    { amount: 100, label: '100 ดวง', desc: 'ส่งหัวใจ 100 ดวง' },
    { amount: 200, label: '200 ดวง', desc: 'ส่งหัวใจ 200 ดวง' },
    { amount: 500, label: '500 ดวง', desc: 'ส่งหัวใจ 500 ดวง' },
  ];

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: any) => {
    const val = parseInt(e.target.value) || 0;
    setSelectedAmount(val);
    setCustomAmount(e.target.value);
  };

  const isButtonDisabled = selectedAmount < 1 || loading;

  const getButtonText = () => {
    if (loading) return loadingText || 'กำลังดำเนินการ...';
    if (selectedAmount >= 1) return `ส่งหัวใจ ${selectedAmount.toLocaleString()} ดวง ❤`;
    return 'ดำเนินการต่อ';
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (selectedAmount < 1) return;

    setLoading(true);
    setLoadingText('กำลังเตรียมส่งหัวใจ...');

    try {
      const res = await fetch('/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedAmount,
          name: donorName,
          message: donorMessage,
          creatorUsername: username
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งหัวใจ');
      }

      if (data.paymentUrl) {
        setLoadingText('กำลังพาท่านไปหน้าชำระเงิน...');
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('ไม่ได้รับลิงก์ชำระเงินจากเซิร์ฟเวอร์');
      }
    } catch (err: any) {
      setModalConfig({ show: true, title: 'เกิดข้อผิดพลาด', message: err.message });
      setLoading(false);
    }
  };

  if (errorMsg) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="card glass-card">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2>ไม่พบชื่อผู้ใช้นี้ในระบบ</h2>
          <p className="subtitle" style={{ marginTop: '10px' }}>โปรดตรวจสอบลิงก์ส่งหัวใจของคุณอีกครั้ง</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="card glass-card">
          <p className="subtitle">กำลังดาวน์โหลดข้อมูลผู้รับหัวใจ...</p>
        </div>
      </div>
    );
  }

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
              <div className="glowing-heart"><span className="heart-icon heart-lg" /></div>
              <h1>ส่งหัวใจสนับสนุน {creator.displayName}</h1>
              <p className="subtitle">
                ร่วมส่งหัวใจเพื่อเป็นกำลังใจให้ {creator.displayName} (1 ดวง = 1 บาท) ✨
              </p>
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
                  <span className="amount-emoji"><span className="heart-icon" /></span>
                  <span className="amount-val">{p.label}</span>
                  <span className="amount-desc">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="custom-amount">
              <label htmlFor="customAmount">หรือระบุจำนวนหัวใจด้วยตนเอง</label>
              <div className="input-group">
                <span className="currency"><span className="heart-icon heart-sm" /></span>
                <input
                  id="customAmount"
                  type="number"
                  placeholder="ระบุจำนวนหัวใจที่ต้องการ..."
                  min="1"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />
              </div>
              <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                * ยอดชำระจริงจะเป็นสกุลเงินบาท (THB) ตามอัตรา 1 ดวง = 1 บาท
              </small>
            </div>

            {/* Donor info */}
            <div className="donor-info">
              <div className="donor-field">
                <label htmlFor="donorName">ชื่อผู้ส่งหัวใจ (จะแสดงบนสตรีม)</label>
                <input
                  id="donorName"
                  type="text"
                  placeholder="ระบุชื่อของคุณ (เช่น น้องเป็ดใจดี)..."
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>

              <div className="donor-field">
                <label htmlFor="donorMessage">ข้อความของคุณ (จะถูกอ่านออกเสียงโดย AI)</label>
                <textarea
                  id="donorMessage"
                  placeholder="ฝากข้อความถึงสตรีมเมอร์ที่นี่..."
                  rows={2}
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                />
              </div>
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

      {/* Reusable premium modal alert */}
      {modalConfig.show && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>❌ {modalConfig.title}</h3>
              <button className="btn-close" onClick={() => setModalConfig({ ...modalConfig, show: false })}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {modalConfig.message}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '14px', width: 'auto' }}
                onClick={() => setModalConfig({ ...modalConfig, show: false })}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
