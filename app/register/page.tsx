'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/globals.css';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setErrorMsg('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดกลางเท่านั้น');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`สมัครสมาชิกสตรีมเมอร์ @${cleanUsername} สำเร็จ! กำลังพาท่านไปหน้าล็อกอิน...`);
        setUsername('');
        setEmail('');
        setDisplayName('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login');
        }, 2500);
      } else {
        setErrorMsg(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Glowing Background Blur Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1" style={{ opacity: 0.1, filter: 'blur(120px)' }}></div>
        <div className="orb orb-2" style={{ opacity: 0.1, filter: 'blur(120px)' }}></div>
      </div>

      <div className="container" style={{ margin: '0 auto', maxWidth: '450px' }}>
        <div className="auth-card-clean">
          <div className="auth-header-clean">
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <span className="heart-icon heart-md" style={{ filter: 'none' }} />
            </div>
            <h1>ลงทะเบียนสตรีมเมอร์</h1>
            <p className="subtitle">
              สร้างบัญชีใหม่เพื่อตั้งค่ากล่องแจ้งเตือนและรับหัวใจสนับสนุน
            </p>
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.12)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#34d399',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.12)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              🎉 {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="username" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>ชื่อผู้ใช้ (Username)</label>
              <input
                id="username"
                type="text"
                placeholder="ภาษาอังกฤษ ตัวเลข หรือขีดกลางเท่านั้น"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="displayName" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>ชื่อแสดงในระบบ (Display Name)</label>
              <input
                id="displayName"
                type="text"
                placeholder="เช่น Sura Gaming Channel"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="email" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>อีเมล (Email)</label>
              <input
                id="email"
                type="email"
                placeholder="เช่น email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="password" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>รหัสผ่าน (Password)</label>
              <input
                id="password"
                type="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="confirmPassword" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>ยืนยันรหัสผ่าน (Confirm Password)</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="ระบุรหัสผ่านอีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-button-clean"
              style={{ marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนบัญชีใหม่'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            มีบัญชีสตรีมเมอร์อยู่แล้ว?{' '}
            <a href="/login" style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}>
              เข้าสู่ระบบที่นี่
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
