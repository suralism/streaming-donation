'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import '@/app/globals.css';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any;
      if (u.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password
      });

      if (res?.error) {
        setErrorMsg(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
      } else {
        // Redirection handled by useEffect
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

      <div className="container" style={{ margin: '0 auto', maxWidth: '420px' }}>
        <div className="auth-card-clean">
          <div className="auth-header-clean">
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <span className="heart-icon heart-md" style={{ filter: 'none' }} />
            </div>
            <h1>เข้าสู่ระบบ</h1>
            <p className="subtitle">
              เข้าสู่ระบบเพื่อจัดการตั้งค่าของสตรีมเมอร์
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
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="username" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 500 }}>ชื่อผู้ใช้ (Username)</label>
              <input
                id="username"
                type="text"
                placeholder="ระบุชื่อผู้ใช้ของคุณหรือแอดมิน"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input-clean"
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="password" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 500 }}>รหัสผ่าน (Password)</label>
              <input
                id="password"
                type="password"
                placeholder="ระบุรหัสผ่านของคุณ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            ยังไม่มีบัญชีสตรีมเมอร์?{' '}
            <a href="/register" style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}>
              สมัครสมาชิกที่นี่
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
