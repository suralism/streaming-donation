'use client';

import { useState, useEffect, useRef } from 'react';

export default function AlertTestPage() {
  const [donor, setDonor] = useState('');
  const [amount, setAmount] = useState('100');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/overlay`;
      setOverlayUrl(url);
      setConnected(true);
    }
  }, []);

  const handleQuickAmount = (val) => {
    setAmount(val.toString());
  };

  const copyToClipboard = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addLog = (text, type = '') => {
    const time = new Date().toLocaleTimeString('th-TH');
    setLogs((prev) => [{ id: Math.random().toString(), time, text, type }, ...prev].slice(0, 20));
  };

  const handleSendTestAlert = async (e?: any) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const sendRes = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor: donor || 'ผู้ทดสอบ',
          amount: Number(amount) || 100,
          message: message || 'นี่คือ test alert 🎉'
        })
      });

      const data = await sendRes.json();

      if (sendRes.ok && data.success) {
        addLog(`✅ Alert sent successfully for ${donor || 'ผู้ทดสอบ'} ฿${Number(amount).toLocaleString()}`, 'success');
      } else {
        addLog(`❌ Failed to send alert: ${data.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      addLog(`❌ Error connecting to server: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter to send alert
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSendTestAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [donor, amount, message]);

  return (
    <>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif;
          background: #0f0f19;
          color: #e0e0e0;
          min-height: 100vh;
        }
        .layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          min-height: 100vh;
          width: 100vw;
          position: fixed;
          top: 0;
          left: 0;
        }
        .sidebar {
          background: rgba(20, 20, 35, 0.95);
          border-right: 1px solid rgba(102, 126, 234, 0.15);
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }
        .sidebar h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #667eea, #f093fb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sidebar p.subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
          margin-bottom: 0;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(102, 126, 234, 0.1);
          color: rgba(102, 126, 234, 0.8);
          border: 1px solid rgba(102, 126, 234, 0.2);
          width: fit-content;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #667eea;
          animation: dotPulse 2s ease-in-out infinite;
        }
        .status-badge.connected .status-dot { background: #4ade80; }
        .status-badge.connected { color: rgba(74, 222, 128, 0.8); border-color: rgba(74, 222, 128, 0.2); background: rgba(74, 222, 128, 0.1); }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-group input,
        .form-group textarea {
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          border-color: rgba(102, 126, 234, 0.5);
        }
        .quick-amounts {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .quick-btn {
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-btn:hover {
          background: rgba(102, 126, 234, 0.15);
          border-color: rgba(102, 126, 234, 0.3);
        }
        .quick-btn.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
          border-color: rgba(102, 126, 234, 0.5);
          color: #fff;
        }
        .btn-send {
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
        }
        .btn-send:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .log {
          margin-top: auto;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          max-height: 150px;
          overflow-y: auto;
          padding: 12px;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
        }
        .log-entry {
          padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          word-break: break-all;
        }
        .log-entry.success { color: #4ade80; }
        .log-entry.error { color: #f87171; }
        .url-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .url-box code {
          flex: 1;
          font-size: 11px;
          color: rgba(102, 126, 234, 0.8);
          word-break: break-all;
        }
        .btn-copy {
          padding: 6px 10px;
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 6px;
          color: #667eea;
          font-size: 11px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .btn-copy:hover {
          background: rgba(102, 126, 234, 0.25);
        }
        .preview {
          background: #1a1a2e;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .preview-header {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #151525;
        }
        .preview-header h2 {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          margin: 0;
        }
        .preview-header .hint {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
        }
        .preview iframe {
          flex: 1;
          border: none;
          width: 100%;
          background: transparent;
        }
        @media (max-width: 768px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 400px;
            position: relative;
          }
        }
      `}</style>

      <div className="layout">
        {/* Sidebar: Controls */}
        <form className="sidebar" onSubmit={handleSendTestAlert}>
          <div>
            <h1>🧪 Alert Test Dashboard</h1>
            <p className="subtitle">ส่ง test alert ไปยัง overlay</p>
          </div>

          <div className={`status-badge ${connected ? 'connected' : ''}`}>
            <div className="status-dot"></div>
            <span>{connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}</span>
          </div>

          <div className="form-group">
            <label>Overlay URL (สำหรับ OBS Browser Source)</label>
            <div className="url-box">
              <code>{overlayUrl || 'loading...'}</code>
              <button type="button" className="btn-copy" onClick={copyToClipboard}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>ชื่อผู้บริจาค</label>
            <input
              type="text"
              placeholder="Anonymous"
              value={donor}
              onChange={(e) => setDonor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <div className="quick-amounts">
              {[50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`quick-btn ${amount === val.toString() ? 'active' : ''}`}
                  onClick={() => handleQuickAmount(val)}
                >
                  ฿{val.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              min="1"
              placeholder="100"
              style={{ marginTop: '8px' }}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>ข้อความ</label>
            <textarea
              rows={2}
              placeholder="สู้ๆ นะครับ! 💪"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-send" disabled={loading}>
            {loading ? '⏳ กำลังส่ง...' : '🚀 ส่ง Test Alert'}
          </button>

          <div className="log">
            {logs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.2)' }}>— ยังไม่มี log —</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  [{log.time}] {log.text}
                </div>
              ))
            )}
          </div>
        </form>

        {/* Preview: Overlay iframe */}
        <div className="preview">
          <div className="preview-header">
            <h2>📺 Overlay Preview</h2>
            <span className="hint">แสดง alert ที่ส่งแบบ real-time</span>
          </div>
          <iframe id="overlayFrame" src="/overlay" title="Overlay Preview" />
        </div>
      </div>
    </>
  );
}
