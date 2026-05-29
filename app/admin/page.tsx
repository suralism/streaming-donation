'use client';

import { useState, useEffect, useRef } from 'react';
import './admin.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalAmount: 0, successCount: 0, rate: 0, pending: 0, failed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inspectTx, setInspectTx] = useState(null);
  const [obsUrl, setObsUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [voices, setVoices] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Settings Form State
  const [theme, setTheme] = useState('glassmorphism');
  const [fontFamily, setFontFamily] = useState('Noto Sans Thai');
  const [animation, setAnimation] = useState('slide-down');
  const [duration, setDuration] = useState(8);
  const [particleCount, setParticleCount] = useState(15);
  const [fontSize, setFontSize] = useState(32);

  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [secondaryColor, setSecondaryColor] = useState('#764ba2');
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('rgba(15, 15, 25, 0.88)');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundChoice, setSoundChoice] = useState('chime');
  const [soundVolume, setSoundVolume] = useState(0.5);

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('default');
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [ttsRate, setTtsRate] = useState(1.0);

  const [messageTemplate, setMessageTemplate] = useState('{donor} ได้บริจาค {amount} บาท! 🎉');
  const [showDonorMessage, setShowDonorMessage] = useState(true);
  const [minAmount, setMinAmount] = useState(1);

  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(true);
  const [profanityReplaceStyle, setProfanityReplaceStyle] = useState('asterisks');
  const [profanityWords, setProfanityWords] = useState('');

  const iframeRef = useRef(null);

  // Load voices for TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Sync hostname to OBS URL box
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setObsUrl(`${window.location.origin}/overlay`);
    }
  }, []);

  // Fetch transactions and settings on mount
  useEffect(() => {
    fetchData();
    loadSettings();

    // Auto-refresh stats silently every 20 seconds
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        // Sort newest first
        data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTransactions(data);
        calculateStats(data);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const calculateStats = (txList) => {
    let total = 0;
    let success = 0;
    let pending = 0;
    let failed = 0;

    txList.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.status === 'successful') {
        total += amt;
        success++;
      } else if (t.status === 'pending') {
        pending++;
      } else if (t.status === 'failed') {
        failed++;
      }
    });

    const completed = success + failed;
    const rate = completed > 0 ? Math.round((success / completed) * 100) : 0;

    setStats({ totalAmount: total, successCount: success, rate, pending, failed });
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/overlay/settings');
      if (res.ok) {
        const s = await res.json();
        setTheme(s.theme);
        setFontFamily(s.fontFamily);
        setAnimation(s.animation);
        setDuration(s.duration);
        setParticleCount(s.particleCount);
        setFontSize(s.fontSize || 32);

        setPrimaryColor(s.primaryColor);
        setSecondaryColor(s.secondaryColor);
        setTextColor(s.textColor);
        setBackgroundColor(s.backgroundColor);

        setSoundEnabled(s.soundEnabled);
        setSoundChoice(s.soundChoice);
        setSoundVolume(s.soundVolume);

        setTtsEnabled(s.ttsEnabled);
        setTtsVoice(s.ttsVoice || 'default');
        setTtsVolume(s.ttsVolume);
        setTtsRate(s.ttsRate);

        setMessageTemplate(s.messageTemplate);
        setShowDonorMessage(s.showDonorMessage);
        setMinAmount(s.minAmount);

        setProfanityFilterEnabled(s.profanityFilterEnabled);
        setProfanityReplaceStyle(s.profanityReplaceStyle || 'asterisks');
        setProfanityWords(s.profanityWords || '');
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const handleCopyObsUrl = () => {
    if (!obsUrl) return;
    navigator.clipboard.writeText(obsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInspect = (tx) => {
    setInspectTx(tx);
  };

  const handleCloseModal = () => {
    setInspectTx(null);
  };

  const handleForcePay = async (id) => {
    if (!confirm('ต้องการบังคับให้สถานะรายการนี้เป็น "ชำระเงินสำเร็จ" หรือไม่? การกระทำนี้จะยิง Alert ขึ้นหน้าจอด้วย')) return;

    try {
      const res = await fetch(`/api/transactions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'successful' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleSimulateAlert = async (tx) => {
    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor: tx.donor,
          amount: tx.amount,
          message: tx.message
        })
      });
    } catch (err) {
      console.error('Simulate alert call failed:', err);
    }
  };

  const triggerRandomTestAlert = async () => {
    const names = ['สมศักดิ์ รักเรียน', 'แม่ค้าออนไลน์สายลุย', 'น้องเป็ดก้าบๆ 🐤', 'สุดหล่อคีย์บอร์ดเรืองแสง', 'SuraGaming 🎮', 'นินจานักพัฒนา', 'ผู้สนับสนุนลึกลับ'];
    const messages = ['สู้ๆ นะครับพี่! เป็นกำลังใจให้ทุกไลฟ์เลย 💪', 'ขอเพลงสากลชิลๆ เพลงนึงค่าา 🎵', 'ระบบใหม่เฟี้ยวเงาะมากครับ! ✨', 'บริจาคค่าน้ำเก๊กฮวยเย็นๆ ครับผม 🍺', 'พัฒนาต่อไปครับ ชอบเว็บนี้มาก 🚀', '', 'สุดจัดปลัดบอก ขนาดปลัดลาออกยังต้องบอกว่าสุดจัด!'];
    const amounts = [50, 100, 250, 500, 1000, 2500, 5000];

    const donor = names[Math.floor(Math.random() * names.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];

    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor, amount, message })
      });
    } catch (e) {
      console.error('Failed to trigger test alert:', e);
    }
  };

  const reloadPreviewFrame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const hexToRgbA = (hex, alpha = 1) => {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return hex;
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();

    const payload = {
      theme,
      fontFamily,
      animation,
      duration: Number(duration),
      particleCount: Number(particleCount),
      fontSize: Number(fontSize) || 32,
      
      primaryColor,
      secondaryColor,
      textColor,
      backgroundColor,
      borderColor: hexToRgbA(primaryColor, 0.25),
      
      soundEnabled,
      soundChoice,
      soundVolume: Number(soundVolume),
      
      ttsEnabled,
      ttsLanguage: 'th-TH',
      ttsVoice,
      ttsVolume: Number(ttsVolume),
      ttsRate: Number(ttsRate),

      messageTemplate,
      showDonorMessage,
      minAmount: Number(minAmount) || 1,
      
      profanityFilterEnabled,
      profanityWords,
      profanityReplaceStyle
    };

    try {
      const res = await fetch('/api/overlay/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('💾 บันทึกและซิงค์การตั้งค่าสำเร็จ! หน้าจอจำลองสดจะปรับดีไซน์ใหม่ทันที 🎉');
      }
    } catch (err) {
      alert('❌ ไม่สามารถบันทึกการตั้งค่าได้');
    }
  };

  // Filtered transactions for the full tab
  const filteredTransactions = transactions.filter((t) => {
    const donorName = (t.donor || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = donorName.includes(query);
    const statusMatch = statusFilter === 'all' || t.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Calculate pagination metrics
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // Microsoft premium speech engine states
  const hasPremwadee = voices.some(v => v.name.toLowerCase().includes('premwadee'));
  const hasNiwat = voices.some(v => v.name.toLowerCase().includes('niwat'));
  const hasAchara = voices.some(v => v.name.toLowerCase().includes('achara'));

  let voiceHint = 'เอนจินเครื่อง: ';
  voiceHint += `เปรมวดี ${hasPremwadee ? '✅ พร้อมใช้' : '❌ ไม่มี'} | `;
  voiceHint += `นิวัต ${hasNiwat ? '✅ พร้อมใช้' : '❌ ไม่มี'} | `;
  voiceHint += `อัจฉรา ${hasAchara ? '✅ พร้อมใช้' : '❌ ไม่มี'}`;
  if (!hasPremwadee && !hasNiwat && !hasAchara) {
    voiceHint += ' (ใช้เสียง Google Cloud ให้อัตโนมัติ 🌟)';
  } else {
    voiceHint += ' (เลือกใช้เสียงพรีเมียมที่มีเครื่องหมาย ✅ ได้เลย)';
  }

  return (
    <div className="admin-wrapper">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-logo">💝</div>
          <div className="brand-text">
            <h2>Stream Donation</h2>
            <span>Admin Controls</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="icon">📊</span> Dashboard Overview
          </button>
          <button
            className={`menu-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className="icon">💸</span> Donation History
          </button>
          <button
            className={`menu-item ${activeTab === 'overlay-config' ? 'active' : ''}`}
            onClick={() => setActiveTab('overlay-config')}
          >
            <span className="icon">🎨</span> Overlay Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>Server Status: <span className="status-indicator online"></span> Online</p>
          <span className="version">v1.1.0 (Live Stream alert)</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top header bar */}
        <header className="main-header">
          <div className="header-left">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'transactions' && 'Donation History'}
              {activeTab === 'overlay-config' && 'Overlay Live Settings'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'ภาพรวมยอดบริจาคและสถิติระบบ'}
              {activeTab === 'transactions' && 'ประวัติธุรกรรมและการจำลองส่ง Alert'}
              {activeTab === 'overlay-config' && 'ปรับแต่งดีไซน์ รูปแบบ เสียง และข้อความเตือนของ OBS Stream'}
            </p>
          </div>
          <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary" style={{ textDecoration: 'none' }}>
              🔗 เปิดหน้าบริจาค
            </a>
            <button className="admin-btn admin-btn-primary" onClick={triggerRandomTestAlert}>
              ⚡ ยิง Quick Alert
            </button>
          </div>
        </header>

        <div className="content-container">
          {/* SECTION: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="tab-content active">
              {/* Metric Stat Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon amount">฿</div>
                  <div className="stat-info">
                    <h3>ยอดบริจาครวม</h3>
                    <h2>฿{stats.totalAmount.toLocaleString('th-TH')}</h2>
                    <span className="stat-trend success">ชำระเงินสำเร็จ</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon count">✅</div>
                  <div className="stat-info">
                    <h3>บริจาคสำเร็จ (ครั้ง)</h3>
                    <h2>{stats.successCount.toLocaleString()}</h2>
                    <span className="stat-label">Transactions Completed</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon rate">📈</div>
                  <div className="stat-info">
                    <h3>อัตราความสำเร็จ</h3>
                    <h2>{stats.rate}%</h2>
                    <span className="stat-label">Success Rate Ratio</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon pending">⌛</div>
                  <div className="stat-info">
                    <h3>รายการรอ/ล้มเหลว</h3>
                    <h2>{stats.pending} / {stats.failed}</h2>
                    <span className="stat-label">Pending / Failed</span>
                  </div>
                </div>
              </div>

              {/* Bottom Grid */}
              <div className="dashboard-grid">
                {/* Recent Transactions Table */}
                <div className="dashboard-card card-large">
                  <div className="card-header">
                    <h3>ธุรกรรมล่าสุด (Recent Transactions)</h3>
                    <button className="admin-btn admin-btn-text" onClick={() => setActiveTab('transactions')}>
                      ดูทั้งหมด →
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>วัน-เวลา</th>
                          <th>ผู้บริจาค</th>
                          <th>ยอดเงิน</th>
                          <th>ข้อความ</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((t) => (
                          <tr key={t.id}>
                            <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('th-TH') : '-'}</td>
                            <td style={{ fontWeight: 500 }}>{t.donor || 'Anonymous'}</td>
                            <td style={{ fontWeight: 600, color: '#818cf8' }}>฿{(Number(t.amount) || 0).toLocaleString()}</td>
                            <td className="text-muted" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.message || '-'}
                            </td>
                            <td>
                              <span className={`badge ${t.status === 'successful' ? 'badge-success' : t.status === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {transactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted">ยังไม่มีประวัติการบริจาค</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* OBS Setup Card */}
                <div className="dashboard-card card-small">
                  <div className="card-header">
                    <h3>🎬 เชื่อมต่อกับ OBS Studio</h3>
                  </div>
                  <div className="obs-setup-box">
                    <p>คัดลอก URL ด้านล่างไปใส่ใน **Browser Source** ของ OBS เพื่อเปิดใช้ระบบ Alert บริจาคเด้งขึ้นไลฟ์สด:</p>
                    <div className="copy-url-group">
                      <input type="text" readOnly value={obsUrl || 'loading...'} />
                      <button className="admin-btn admin-btn-primary" onClick={handleCopyObsUrl}>
                        {copied ? '✓ Copied' : 'คัดลอก'}
                      </button>
                    </div>
                    <div className="instructions-steps">
                      <div className="step-num">1</div>
                      <p>เปิดโปรแกรม OBS -{'>'} กด **เครื่องหมาย +** ในช่อง Sources</p>
                      
                      <div className="step-num">2</div>
                      <p>เลือก **Browser** ตั้งชื่อว่า "Beam Donation Alert"</p>
                      
                      <div className="step-num">3</div>
                      <p>วาง URL ด้านบนในช่อง URL</p>
                      
                      <div className="step-num">4</div>
                      <p>ตั้งค่า Width: **800** และ Height: **600** (หรือตามต้องการ)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: DONATION HISTORY */}
          {activeTab === 'transactions' && (
            <div className="tab-content active">
              <div className="dashboard-card">
                {/* Filter Bar */}
                <div className="filter-bar">
                  <div className="search-group">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อผู้บริจาค..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="filter-groups">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">แสดงสถานะทั้งหมด</option>
                      <option value="successful">สำเร็จ (Successful)</option>
                      <option value="pending">รอชำระเงิน (Pending)</option>
                      <option value="failed">ล้มเหลว (Failed)</option>
                    </select>
                    <button className="admin-btn admin-btn-secondary" onClick={fetchData}>
                      🔄 รีเฟรช
                    </button>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="table-responsive list-table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>วัน-เวลา</th>
                        <th>Reference / ID</th>
                        <th>ผู้บริจาค</th>
                        <th>ยอดเงิน</th>
                        <th>ข้อความ</th>
                        <th>สถานะ</th>
                        <th>การจัดการ / ทดสอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('th-TH') : '-'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{t.id}</td>
                          <td style={{ fontWeight: 600 }}>{t.donor || 'Anonymous'}</td>
                          <td style={{ fontWeight: 700, color: '#818cf8' }}>฿{(Number(t.amount) || 0).toLocaleString()}</td>
                          <td className="text-muted" style={{ maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                            {t.message || '-'}
                          </td>
                          <td>
                            <span className={`badge ${t.status === 'successful' ? 'badge-success' : t.status === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleInspect(t)}>
                                🔍 Raw
                              </button>
                              <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handleSimulateAlert(t)}>
                                🎉 Test Alert
                              </button>
                              {t.status === 'pending' && (
                                <button
                                  className="admin-btn admin-btn-primary admin-btn-sm"
                                  style={{ background: 'var(--success)', boxShadow: 'none' }}
                                  onClick={() => handleForcePay(t.id)}
                                >
                                  ✔️ Force Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-muted">ไม่พบข้อมูลตรงตามเงื่อนไขที่เลือก</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Premium Pagination Component */}
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <div className="pagination-info">
                      แสดง <span>{indexOfFirstItem + 1}</span> ถึง <span>{Math.min(indexOfLastItem, totalItems)}</span> จากทั้งหมด <span>{totalItems}</span> รายการ
                    </div>
                    <div className="pagination-controls">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm pagination-btn"
                        disabled={activePage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        ◀ ย้อนกลับ
                      </button>
                      
                      {(() => {
                        const pages = [];
                        for (let i = 1; i <= totalPages; i++) {
                          if (totalPages <= 7) {
                            pages.push(i);
                          } else {
                            if (i === 1 || i === totalPages || (i >= activePage - 1 && i <= activePage + 1)) {
                              pages.push(i);
                            } else if (i === activePage - 2 || i === activePage + 2) {
                              pages.push('...');
                            }
                          }
                        }
                        const uniquePages = pages.filter((item, pos, self) => self.indexOf(item) === pos);
                        return uniquePages.map((p, idx) => {
                          if (p === '...') {
                            return <span key={`dots-${idx}`} className="pagination-dots">...</span>;
                          }
                          return (
                            <button
                              key={`page-${p}`}
                              type="button"
                              className={`pagination-page-btn ${activePage === p ? 'active' : ''}`}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}

                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm pagination-btn"
                        disabled={activePage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        ถัดไป ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: OVERLAY CONFIGURATOR */}
          {activeTab === 'overlay-config' && (
            <div className="tab-content active">
              <div className="settings-grid">
                
                {/* Left Form Panels */}
                <div className="settings-panel-scroll">
                  <form onSubmit={handleSaveSettings}>
                    
                    {/* Visual Settings */}
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>🎨 รูปแบบและธีมแสดงผล (Style & Themes)</h4>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="themeSelect">ธีมการแสดงผล</label>
                          <select
                            id="themeSelect"
                            className="form-select"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                          >
                            <option value="glassmorphism">Glassmorphism (กระจกใสพรีเมียม)</option>
                            <option value="cyberpunk">Cyberpunk Neon (สไตล์เกมเมอร์สะท้อนแสง)</option>
                            <option value="minimal">Minimalist Clean (เรียบง่าย สบายตา)</option>
                            <option value="custom">Custom Color (กำหนดสีเองตามต้องการ)</option>
                            <option value="text-only">Text Only (เฉพาะข้อความ ไม่มีกล่อง)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="fontSelect">แบบอักษร (Thai Font)</label>
                          <select
                            id="fontSelect"
                            className="form-select"
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                          >
                            <option value="Noto Sans Thai">Noto Sans Thai (มาตรฐาน)</option>
                            <option value="Kanit">Kanit (โมเดิร์น ยอดนิยม)</option>
                            <option value="Mitr">Mitr (หัวกลม ทันสมัย)</option>
                            <option value="Chakra Petch">Chakra Petch (เก๋ไก๋ ล้ำยุค)</option>
                            <option value="Sarabun">Sarabun (เป็นทางการ)</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom colors picker row */}
                      {(theme === 'custom' || theme === 'glassmorphism' || theme === 'text-only') && (
                        <div className="custom-colors-container" style={{ display: 'block' }}>
                          <h5 className="section-divider">ปรับแต่งสี (Custom Colors)</h5>
                          <div className="color-picker-grid">
                            <div className="color-picker-group">
                              <label>สีหลัก (Primary)</label>
                              <div className="color-input-wrapper">
                                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                                <input type="text" className="hex-text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                              </div>
                            </div>
                            <div className="color-picker-group">
                              <label>สีรอง (Secondary)</label>
                              <div className="color-input-wrapper">
                                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                                <input type="text" className="hex-text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                              </div>
                            </div>
                            <div className="color-picker-group">
                              <label>สีตัวอักษร</label>
                              <div className="color-input-wrapper">
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                                <input type="text" className="hex-text" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                              </div>
                            </div>
                            <div className="color-picker-group">
                              <label>สีพื้นหลัง</label>
                              <div className="color-input-wrapper bg-picker">
                                <input type="color" value={backgroundColor.startsWith('#') ? backgroundColor : '#0f0f19'} onChange={(e) => setBackgroundColor(e.target.value)} />
                                <input type="text" className="hex-text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="animSelect">แอนิเมชันตอนแสดงผล</label>
                          <select
                            id="animSelect"
                            className="form-select"
                            value={animation}
                            onChange={(e) => setAnimation(e.target.value)}
                          >
                            <option value="slide-down">Slide In - เลื่อนลงมาจากด้านบน</option>
                            <option value="slide-up">Slide In - เลื่อนขึ้นมาจากด้านล่าง</option>
                            <option value="fade">Fade In - ค่อยๆ ปรากฏขึ้น</option>
                            <option value="zoom">Zoom In - เด้งขยายออกมา</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="sliderDuration">ระยะเวลา Alert ค้างบนจอ (<span>{duration}</span> วินาที)</label>
                          <input
                            type="range"
                            id="sliderDuration"
                            className="form-range"
                            min="2"
                            max="20"
                            step="1"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="sliderParticles">เอฟเฟกต์ละอองวิบวับ (<span>{particleCount}</span> ชิ้น)</label>
                          <input
                            type="range"
                            id="sliderParticles"
                            className="form-range"
                            min="0"
                            max="30"
                            step="1"
                            value={particleCount}
                            onChange={(e) => setParticleCount(Number(e.target.value))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="sliderFontSize">ขนาดตัวอักษร (<span>{fontSize}</span>px)</label>
                          <input
                            type="range"
                            id="sliderFontSize"
                            className="form-range"
                            min="16"
                            max="72"
                            step="1"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Audio & TTS Settings */}
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>🔊 เสียงแจ้งเตือนและระบบอ่านข้อความ (Sound & TTS AI)</h4>
                      </div>

                      <div className="form-row flex-align-center">
                        <div className="form-group">
                          <div className="switch-group">
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled(e.target.checked)}
                              />
                              <span className="slider-switch"></span>
                            </label>
                            <span className="switch-label">เปิดเสียงเพลงแจ้งเตือน (Chime)</span>
                          </div>
                        </div>
                      </div>

                      {soundEnabled && (
                        <div className="form-row" id="soundVolumeSettingsRow" style={{ display: 'grid' }}>
                          <div className="form-group">
                            <label htmlFor="soundChoiceSelect">เลือกเสียงแจ้งเตือน</label>
                            <select
                              id="soundChoiceSelect"
                              className="form-select"
                              value={soundChoice}
                              onChange={(e) => setSoundChoice(e.target.value)}
                            >
                              <option value="chime">Classic Chime (เสียงเคาะระฆังคู่ใสๆ)</option>
                              <option value="retro">Retro Arcade (เสียงสล๊อตแมชชีน 8-bit)</option>
                              <option value="modern">Modern Pad Synth (เสียงซินธ์อุ่นๆ ทันสมัย)</option>
                              <option value="bell">Soft Bell Resonator (เสียงกระดิ่งคริสตัลคู่)</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor="sliderSoundVolume">ความดังเสียงเตือน (<span>{Math.round(soundVolume * 100)}</span>%)</label>
                            <input
                              type="range"
                              id="sliderSoundVolume"
                              className="form-range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={soundVolume}
                              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      )}

                      <h5 className="section-divider">ระบบ AI อ่านออกเสียง (Text-to-Speech)</h5>

                      <div className="form-row flex-align-center">
                        <div className="form-group">
                          <div className="switch-group">
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={ttsEnabled}
                                onChange={(e) => setTtsEnabled(e.target.checked)}
                              />
                              <span className="slider-switch"></span>
                            </label>
                            <span className="switch-label">💡 เปิดอ่านข้อความบริจาคอัตโนมัติ (TTS)</span>
                          </div>
                        </div>
                      </div>

                      {ttsEnabled && (
                        <div className="tts-sub-settings" style={{ display: 'block' }}>
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor="ttsVoiceSelect">เลือกเสียงพากย์ AI (Speech Voice)</label>
                              <select
                                id="ttsVoiceSelect"
                                className="form-select"
                                value={ttsVoice}
                                onChange={(e) => setTtsVoice(e.target.value)}
                              >
                                <option value="default">ใช้เสียงภาษาไทยเริ่มต้น (System Default - Google Cloud)</option>
                                <option value="Premwadee">เสียงคุณเปรมวดี - Microsoft Premwadee (Premium Female)</option>
                                <option value="Niwat">เสียงคุณนิวัต - Microsoft Niwat (Premium Male)</option>
                                <option value="Achara">เสียงคุณอัจฉรา - Microsoft Achara (Premium Female)</option>
                              </select>
                              <small className="form-hint" style={{ color: '#a78bfa' }}>
                                *{voiceHint}
                              </small>
                            </div>
                            <div className="form-group">
                              <label htmlFor="sliderTtsVolume">ความดังเสียงพูด (<span>{Math.round(ttsVolume * 100)}</span>%)</label>
                              <input
                                type="range"
                                id="sliderTtsVolume"
                                className="form-range"
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={ttsVolume}
                                onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group full-width">
                              <label htmlFor="sliderTtsRate">ความเร็วในการพูด (<span>{ttsRate.toFixed(1)}</span>x)</label>
                              <input
                                type="range"
                                id="sliderTtsRate"
                                className="form-range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={ttsRate}
                                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Profanity Filter Settings */}
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>🤬 ระบบกรองคำหยาบคาย (Profanity Filter)</h4>
                      </div>

                      <div className="form-row flex-align-center">
                        <div className="form-group">
                          <div className="switch-group">
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={profanityFilterEnabled}
                                onChange={(e) => setProfanityFilterEnabled(e.target.checked)}
                              />
                              <span className="slider-switch"></span>
                            </label>
                            <span className="switch-label">เปิดใช้งานระบบกรองคำหยาบ (Anti-Troll)</span>
                          </div>
                        </div>
                      </div>

                      {profanityFilterEnabled && (
                        <div className="tts-sub-settings" style={{ display: 'block' }}>
                          <div className="form-row">
                            <div className="form-group full-width">
                              <label htmlFor="profanityReplaceStyleSelect">รูปแบบการเซนเซอร์คำ</label>
                              <select
                                id="profanityReplaceStyleSelect"
                                className="form-select"
                                value={profanityReplaceStyle}
                                onChange={(e) => setProfanityReplaceStyle(e.target.value)}
                              >
                                <option value="asterisks">ใช้เครื่องหมายดอกจันเซนเซอร์คำหยาบ (เช่น ค***)</option>
                                <option value="polite">แปลงเป็นคำน่ารักสุภาพแทน (เช่น รักนะ, สู้ๆ) 🌸</option>
                                <option value="block">บล็อกข้อความนั้นทั้งหมด (แสดงข้อความถูกกรองโดยระบบ)</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group full-width">
                              <label htmlFor="inputProfanityWords">รายการคำหยาบและคำที่ไม่เหมาะสม (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                              <textarea
                                id="inputProfanityWords"
                                className="form-control"
                                rows={3}
                                style={{ fontFamily: 'inherit', resize: 'vertical' }}
                                value={profanityWords}
                                onChange={(e) => setProfanityWords(e.target.value)}
                              />
                              <small className="form-hint">สามารถลบหรือเพิ่มคำหยาบเพิ่มเติมได้เอง หากคำใดตรงกับข้อความจะถูกกรองออกทันที</small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Settings */}
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>💬 ปรับแต่งข้อความแจ้งเตือน (Text Customization)</h4>
                      </div>

                      <div className="form-row">
                        <div className="form-group full-width">
                          <label htmlFor="inputMessageTemplate">รูปแบบประโยคแจ้งเตือน (Template)</label>
                          <input
                            type="text"
                            id="inputMessageTemplate"
                            className="form-control"
                            value={messageTemplate}
                            onChange={(e) => setMessageTemplate(e.target.value)}
                          />
                          <small className="form-hint">ใช้ <code>{'{donor}'}</code> แทนชื่อผู้บริจาค และ <code>{'{amount}'}</code> แทนจำนวนเงิน</small>
                        </div>
                      </div>

                      <div className="form-row flex-align-center">
                        <div className="form-group">
                          <div className="switch-group">
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={showDonorMessage}
                                onChange={(e) => setShowDonorMessage(e.target.checked)}
                              />
                              <span className="slider-switch"></span>
                            </label>
                            <span className="switch-label">แสดงข้อความแนบของผู้บริจาคด้านล่างตัวเลข</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group full-width">
                          <label htmlFor="inputMinAmount">จำนวนเงินขั้นต่ำที่จะให้แจ้งเตือนบนจอ (บาท)</label>
                          <input
                            type="number"
                            id="inputMinAmount"
                            className="form-control"
                            min="1"
                            value={minAmount}
                            onChange={(e) => setMinAmount(parseInt(e.target.value) || 1)}
                          />
                          <small className="form-hint">ยอดบริจาคที่ต่ำกว่านี้จะบันทึกเข้าระบบ แต่จะไม่โชว์กล่องเตือนบนจอไลฟ์สด</small>
                        </div>
                      </div>
                    </div>

                    {/* Actions block */}
                    <div className="settings-actions">
                      <button type="submit" className="admin-btn admin-btn-primary admin-btn-large">
                        💾 บันทึกและซิงค์การตั้งค่า
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-large"
                        onClick={triggerRandomTestAlert}
                      >
                        🎉 ทดสอบยิง Alert (ด้วยค่าที่ตั้งไว้)
                      </button>
                    </div>

                  </form>
                </div>

                {/* Right Live Preview panel */}
                <div className="settings-preview-panel">
                  <div className="dashboard-card preview-card">
                    <div className="preview-header">
                      <h3>📺 หน้าจอจำลองสด (Live Overlay Preview)</h3>
                      <span className="badge badge-success">SSE Connected</span>
                    </div>
                    <p className="preview-hint">เมื่อกด "ยิงทดสอบ Alert" ด้านซ้าย หรือกดบันทึกค่า จะแสดงการปรับแต่งสดใน Iframe นี้ทันที!</p>
                    <div className="preview-iframe-wrapper">
                      <iframe
                        ref={iframeRef}
                        src="/overlay"
                        id="overlayPreviewIframe"
                        className="preview-iframe"
                        allow="autoplay"
                        title="Live Overlay Preview"
                      />
                    </div>
                    <div className="preview-controls">
                      <button className="admin-btn admin-btn-secondary" onClick={reloadPreviewFrame}>
                        🔄 โหลดตัวอย่างใหม่
                      </button>
                      <span className="text-muted" style={{ fontSize: '12px' }}>
                        หมายเหตุ: ในระบบจริง OBS จะมีพื้นหลังโปร่งใส
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Raw JSON Inspect Modal */}
      {inspectTx && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔍 รายละเอียดธุรกรรม (Raw Transaction JSON)</h3>
              <button className="btn-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <pre>
                <code>{JSON.stringify(inspectTx, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
