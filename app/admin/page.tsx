'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import './admin.css';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalAmount: 0, successCount: 0, rate: 0, pending: 0, failed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inspectTx, setInspectTx] = useState(null);
  
  // SaaS States
  const [usersList, setUsersList] = useState<any[]>([]);
  const selectedUserId = 'system'; // Locked to system admin view
  const [withdrawalList, setWithdrawalList] = useState<any[]>([]);
  
  // Registration Form State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({ show: false, title: '', message: '', type: 'alert' });

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/withdrawals');
      if (res.ok) {
        const data = await res.json();
        setWithdrawalList(data.withdrawals || []);
      }
    } catch (e) {
      console.error('Error fetching withdrawals:', e);
    }
  };

  // Guard routing
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const u = session?.user as any;
      if (u?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  // Fetch stats, transactions on mount
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchUsers();
      fetchData();
      fetchWithdrawals();

      // Auto-refresh stats silently every 15 seconds
      const interval = setInterval(() => {
        fetchUsers();
        fetchData();
        fetchWithdrawals();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [status, session]);


  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchData = async () => {
    try {
      // Fetch all transactions (admin view)
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

  const handleInspect = (tx) => {
    setInspectTx(tx);
  };

  const handleCloseModal = () => {
    setInspectTx(null);
  };

  const handleForcePay = (id) => {
    triggerConfirm(
      'ยืนยันรายการชำระเงิน',
      'ต้องการบังคับให้สถานะรายการนี้เป็น "ชำระเงินสำเร็จ" หรือไม่? การกระทำนี้จะส่งผลต่อยอดกระเป๋าเงินสตรีมเมอร์ด้วย',
      async () => {
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
      }
    );
  };

  const triggerAlert = (title: string, message: string) => {
    setModalConfig({ show: true, title, message, type: 'alert' });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ show: true, title, message, type: 'confirm', onConfirm });
  };

  // Filtered transactions for the full tab
  const filteredTransactions = transactions.filter((t: any) => {
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

  const pendingKycCount = usersList.filter((u: any) => u.kyc_status === 'pending').length;
  const pendingPayoutCount = withdrawalList.filter((w: any) => w.status === 'pending').length;

  if (status === 'loading' || status === 'unauthenticated' || (session?.user as any)?.role !== 'admin') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f19',
        color: '#ffffff',
        fontFamily: 'Noto Sans Thai, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid rgba(255,255,255,0.1)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            borderLeftColor: '#a855f7',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p>กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">

      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="brand" style={{ marginBottom: '20px' }}>
          <div className="brand-logo">👑</div>
          <div className="brand-text">
            <h2>Stream Donation</h2>
            <span>SaaS Admin</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="icon">📊</span> แดชบอร์ดภาพรวมระบบ
          </button>
          <button
            className={`menu-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className="icon">💸</span> ประวัติธุรกรรมสากล
          </button>
          <button
            className={`menu-item ${activeTab === 'user-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('user-management')}
          >
            <span className="icon">👥</span> จัดการสตรีมเมอร์
          </button>
          <button
            className={`menu-item ${activeTab === 'admin-approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-approvals')}
            style={{ borderLeft: '1px solid rgba(168, 85, 247, 0.4)', background: 'rgba(168, 85, 247, 0.03)' }}
          >
            <span className="icon">🛡️</span> ตรวจสอบ KYC & Payout
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>Server Status: <span className="status-indicator online"></span> Online</p>
          <span className="version">v2.0.0 (SaaS Multi-Tenant)</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top header bar */}
        <header className="main-header">
          <div className="header-left">
            <h1>
              {activeTab === 'dashboard' && 'แดชบอร์ดแอดมินระบบหลัก (SaaS Admin Overview)'}
              {activeTab === 'transactions' && 'ประวัติธุรกรรมสากล (Global Transaction History)'}
              {activeTab === 'user-management' && 'จัดการบัญชีสตรีมเมอร์ (Creator Directory)'}
              {activeTab === 'admin-approvals' && 'ระบบอนุมัติเอกสารและคำขอเบิกเงิน (Approvals & KYC)'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'ภาพรวมสถิติรายได้ ยอดทำรายการ และระบบงานของสตรีมเมอร์ทั้งหมดในระบบ'}
              {activeTab === 'transactions' && 'รายการทำธุรกรรมทั้งหมดและรายละเอียดเชิงลึก'}
              {activeTab === 'user-management' && 'ดูรายชื่อสตรีมเมอร์ สมัครสมาชิกใหม่ และติดตามยอดคงเหลือ'}
              {activeTab === 'admin-approvals' && 'จัดการคำขอยืนยันตัวตน KYC และคำสั่งขอเบิกเงินของสตรีมเมอร์'}
            </p>
          </div>
          <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a 
              href="/dashboard" 
              className="admin-btn admin-btn-secondary" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🎮 ไปที่ Streamer Portal (แดชบอร์ดสตรีมเมอร์)
            </a>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="admin-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              🚪 ออกจากระบบ
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
                    <h3>ยอดส่งกำลังใจรวมทั้งระบบ</h3>
                    <h2>฿{stats.totalAmount.toLocaleString('th-TH')}</h2>
                    <span className="stat-trend success">ชำระเงินสำเร็จ</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon count">✅</div>
                  <div className="stat-info">
                    <h3>ทำรายการสำเร็จ (ครั้ง)</h3>
                    <h2>{stats.successCount.toLocaleString()}</h2>
                    <span className="stat-label">Transactions Completed</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon rate">📈</div>
                  <div className="stat-info">
                    <h3>อัตราความสำเร็จเฉลี่ย</h3>
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
                    <h3>ธุรกรรมล่าสุดของระบบ (Recent Global Transactions)</h3>
                    <button className="admin-btn admin-btn-text" onClick={() => setActiveTab('transactions')}>
                      ดูทั้งหมด →
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>วัน-เวลา</th>
                          <th>ผู้ส่งกำลังใจ</th>
                          <th>ยอดเงิน</th>
                          <th>ข้อความ</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((t: any) => (
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
                            <td colSpan={5} className="text-center text-muted">ยังไม่มีประวัติการส่งกำลังใจ</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Admin Control Hub */}
                <div className="dashboard-card card-small">
                  <div className="card-header">
                    <h3>🛡️ การจัดการระบบหลัก (Admin Hub)</h3>
                  </div>
                  <div className="obs-setup-box" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
                      ยินดีต้อนรับเข้าสู่ระบบจัดการแอดมินกลาง คุณสามารถติดตามงานและอนุมัติรายการต่างๆ ของสตรีมเมอร์ได้ดังนี้:
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '13.5px', color: '#e2e8f0' }}>🔍 คำขอตรวจสอบ KYC ที่ค้างอยู่</span>
                        <span className={`badge ${pendingKycCount > 0 ? 'badge-pending' : ''}`} style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px' }}>
                          {pendingKycCount} รายการ
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '13.5px', color: '#e2e8f0' }}>💸 คำขอถอนเงินที่รอประมวลผล</span>
                        <span className={`badge ${pendingPayoutCount > 0 ? 'badge-pending' : ''}`} style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px' }}>
                          {pendingPayoutCount} รายการ
                        </span>
                      </div>
                    </div>

                    <button 
                      className="admin-btn admin-btn-primary" 
                      style={{ width: '100%', marginTop: '20px', padding: '10px' }}
                      onClick={() => setActiveTab('admin-approvals')}
                    >
                      🛡️ ไปที่หน้าอนุมัติ Payout & KYC
                    </button>
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
                      placeholder="ค้นหาชื่อผู้ส่งกำลังใจ..."
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
                        <th>ผู้ส่งกำลังใจ</th>
                        <th>ยอดเงิน</th>
                        <th>ข้อความ</th>
                        <th>สถานะ</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((t: any) => (
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
                        const pages: any[] = [];
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

          {/* SECTION: USER MANAGEMENT */}
          {activeTab === 'user-management' && (
            <div className="tab-content active">
              <div className="settings-grid" style={{ gridTemplateColumns: '1fr 380px' }}>
                
                {/* Users List Card */}
                <div className="dashboard-card" style={{ padding: '20px' }}>
                  <div className="card-header" style={{ marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>👥 รายชื่อสตรีมเมอร์ในระบบทั้งหมด</h3>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>สตรีมเมอร์</th>
                          <th>อีเมล</th>
                          <th>ยอดหัวใจสะสม</th>
                          <th>สถานะ KYC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((u: any) => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.display_name || u.username}</div>
                              <div className="text-muted" style={{ fontSize: '11px' }}>@{u.username}</div>
                            </td>
                            <td>{u.email}</td>
                            <td style={{ fontWeight: 700, color: '#818cf8' }}>
                              {(u.coin_balance || 0).toLocaleString()} ดวง
                            </td>
                            <td>
                              {u.kyc_status === 'approved' && <span className="badge badge-success">อนุมัติแล้ว</span>}
                              {u.kyc_status === 'pending' && <span className="badge badge-pending">รอตรวจสอบ</span>}
                              {u.kyc_status === 'rejected' && <span className="badge badge-failed">ปฏิเสธ</span>}
                              {(u.kyc_status === 'unsubmitted' || !u.kyc_status) && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>ยังไม่ยื่น</span>}
                            </td>
                          </tr>
                        ))}
                        {usersList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted" style={{ padding: '20px' }}>ยังไม่มีสตรีมเมอร์ในระบบ</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Register New User Card */}
                <div className="dashboard-card settings-card" style={{ padding: '20px' }}>
                  <div className="settings-card-header" style={{ marginBottom: '15px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700 }}>➕ สมัครสตรีมเมอร์ใหม่ (Register Creator)</h4>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!regUsername || !regEmail || !regPassword) {
                      triggerAlert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลที่จำเป็นรวมถึงรหัสผ่านให้ครบถ้วน');
                      return;
                    }
                    if (regPassword.length < 6) {
                      triggerAlert('ข้อผิดพลาด', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
                      return;
                    }
                    try {
                      const res = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          username: regUsername,
                          email: regEmail,
                          displayName: regDisplayName,
                          password: regPassword
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        triggerAlert('สำเร็จ', `สร้างบัญชีสตรีมเมอร์ @${regUsername} สำเร็จ!`);
                        setRegUsername('');
                        setRegEmail('');
                        setRegDisplayName('');
                        setRegPassword('');
                        fetchUsers();
                      } else {
                        triggerAlert('ข้อผิดพลาด', data.error || 'ไม่สามารถสมัครได้');
                      }
                    } catch (err: any) {
                      triggerAlert('ข้อผิดพลาด', err.message);
                    }
                  }}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ชื่อผู้ใช้ (username - ภาษาอังกฤษเท่านั้น)</label>
                      <input 
                        type="text" 
                        placeholder="เช่น suragaming" 
                        className="form-control" 
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ชื่อแสดงในระบบ (Display Name)</label>
                      <input 
                        type="text" 
                        placeholder="เช่น Sura Gaming Channel" 
                        className="form-control" 
                        value={regDisplayName}
                        onChange={(e) => setRegDisplayName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>อีเมล (Email)</label>
                      <input 
                        type="email" 
                        placeholder="เช่น email@domain.com" 
                        className="form-control" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>รหัสผ่านเริ่มต้น (Default Password)</label>
                      <input 
                        type="password" 
                        placeholder="อย่างน้อย 6 ตัวอักษร" 
                        className="form-control" 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="admin-btn admin-btn-primary" 
                      style={{ width: '100%' }}
                    >
                      สร้างบัญชีสตรีมเมอร์
                    </button>
                  </form>

                </div>

              </div>
            </div>
          )}

          {/* SECTION: ADMIN APPROVALS (PAYOUT & KYC) */}
          {activeTab === 'admin-approvals' && (
            <div className="tab-content active">
              <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                
                {/* KYC Approval Section */}
                <div className="dashboard-card" style={{ padding: '20px' }}>
                  <div className="card-header" style={{ marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>🔍 ตรวจสอบเอกสาร KYC ของสตรีมเมอร์</h3>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ผู้ใช้งาน</th>
                          <th>ข้อมูลธนาคาร</th>
                          <th>เอกสาร</th>
                          <th>สถานะ</th>
                          <th>ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.filter((u: any) => u.kyc_status !== 'unsubmitted' && u.kyc_status !== null).map((u: any) => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.display_name || u.username}</div>
                              <div className="text-muted" style={{ fontSize: '11px' }}>@{u.username}</div>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <div>{u.bank_name || '-'}</div>
                              <div style={{ fontFamily: 'monospace' }}>{u.bank_account_number || '-'}</div>
                              <div className="text-muted">{u.bank_account_holder || '-'}</div>
                            </td>
                            <td>
                              {u.kyc_document_url ? (
                                <a href={u.kyc_document_url} target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary admin-btn-sm" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none', display: 'inline-block' }}>
                                  📄 เปิดดู
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {u.kyc_status === 'approved' && <span className="badge badge-success">ผ่าน (Approved)</span>}
                              {u.kyc_status === 'pending' && <span className="badge badge-pending">รอตรวจ (Pending)</span>}
                              {u.kyc_status === 'rejected' && <span className="badge badge-failed">ปฏิเสธ (Rejected)</span>}
                            </td>
                            <td>
                              {u.kyc_status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="admin-btn admin-btn-primary admin-btn-sm" 
                                    style={{ background: '#10b981', padding: '4px 8px', fontSize: '11px' }}
                                    onClick={async () => {
                                      triggerConfirm('อนุมัติ KYC', `ต้องการอนุมัติ KYC สำหรับบัญชี @${u.username} ใช่หรือไม่?`, async () => {
                                        const res = await fetch('/api/admin/approve-kyc', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: u.id, status: 'approved' })
                                        });
                                        if (res.ok) {
                                          triggerAlert('อนุมัติเรียบร้อย', `อนุมัติ KYC ของผู้ใช้ @${u.username} สำเร็จ`);
                                          fetchUsers();
                                        } else {
                                          const err = await res.json();
                                          triggerAlert('ผิดพลาด', err.error || 'ไม่สามารถอนุมัติได้');
                                        }
                                      });
                                    }}
                                  >
                                    อนุมัติ
                                  </button>
                                  <button 
                                    className="admin-btn admin-btn-secondary admin-btn-sm" 
                                    style={{ background: '#ef4444', padding: '4px 8px', fontSize: '11px', color: '#ffffff' }}
                                    onClick={async () => {
                                      const reason = window.prompt('ระบุเหตุผลในการปฏิเสธเอกสาร:');
                                      if (reason === null) return;
                                      const res = await fetch('/api/admin/approve-kyc', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: u.id, status: 'rejected', reason: reason || 'เอกสารไม่ตรงตามเกณฑ์' })
                                      });
                                      if (res.ok) {
                                        triggerAlert('ปฏิเสธเรียบร้อย', `ปฏิเสธ KYC ของผู้ใช้ @${u.username} เรียบร้อย`);
                                        fetchUsers();
                                      } else {
                                        const err = await res.json();
                                        triggerAlert('ผิดพลาด', err.error || 'ไม่สามารถบันทึกสถานะได้');
                                      }
                                    }}
                                  >
                                    ปฏิเสธ
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted">ตรวจสอบแล้ว</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {usersList.filter((u: any) => u.kyc_status !== 'unsubmitted' && u.kyc_status !== null).length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted" style={{ padding: '20px' }}>ไม่มีข้อมูลการยื่นขออนุมัติ KYC</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payout / Withdrawal Approvals Section */}
                <div className="dashboard-card" style={{ padding: '20px' }}>
                  <div className="card-header" style={{ marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>💸 อนุมัติคำขอเบิกเงินถอน (Withdrawal Requests)</h3>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>สตรีมเมอร์</th>
                          <th>หัวใจที่เบิก / เงินโอน</th>
                          <th>วันยื่นขอ</th>
                          <th>สถานะ</th>
                          <th>ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawalList.map((w: any) => (
                          <tr key={w.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{w.display_name || w.username}</div>
                              <div className="text-muted" style={{ fontSize: '11px' }}>@{w.username}</div>
                            </td>
                            <td>
                              <div>{Number(w.coin_amount).toLocaleString()} ดวง</div>
                              <div style={{ fontWeight: 700, color: '#818cf8', fontSize: '13px' }}>฿{Number(w.payout_amount).toLocaleString()}</div>
                              <div className="text-muted" style={{ fontSize: '10px' }}>*หัก 5% แพลตฟอร์มแล้ว</div>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {new Date(w.created_at).toLocaleDateString('th-TH')}
                            </td>
                            <td>
                              {w.status === 'approved' && <span className="badge badge-success">โอนแล้ว</span>}
                              {w.status === 'pending' && <span className="badge badge-pending">รอโอน</span>}
                              {w.status === 'rejected' && <span className="badge badge-failed">ยกเลิก/คืนหัวใจ</span>}
                            </td>
                            <td>
                              {w.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="admin-btn admin-btn-primary" 
                                    style={{ background: '#10b981', padding: '4px 8px', fontSize: '11px' }}
                                    onClick={async () => {
                                      triggerConfirm('อนุมัติการโอนเงิน', `ยืนยันว่าได้โอนเงินจริงเข้าบัญชีปลายทางจำนวน ฿${Number(w.payout_amount).toLocaleString()} เรียบร้อยแล้ว?`, async () => {
                                        const res = await fetch('/api/admin/approve-payout', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ withdrawalId: w.id, status: 'approved' })
                                        });
                                        if (res.ok) {
                                          triggerAlert('อนุมัติแล้ว', 'ยืนยันโอนเงินสำเร็จ!');
                                          fetchWithdrawals();
                                          fetchUsers();
                                        } else {
                                          const err = await res.json();
                                          triggerAlert('ผิดพลาด', err.error || 'ไม่สามารถดำเนินการได้');
                                        }
                                      });
                                    }}
                                  >
                                    จ่ายแล้ว
                                  </button>
                                  <button 
                                    className="admin-btn admin-btn-secondary" 
                                    style={{ background: '#ef4444', padding: '4px 8px', fontSize: '11px', color: '#ffffff' }}
                                    onClick={async () => {
                                      const reason = window.prompt('ระบุหมายเหตุในการยกเลิกรายการถอนเงิน:');
                                      if (reason === null) return;
                                      const res = await fetch('/api/admin/approve-payout', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ withdrawalId: w.id, status: 'rejected', adminNotes: reason || 'ยกเลิกรายการโดยแอดมิน' })
                                      });
                                      if (res.ok) {
                                        triggerAlert('ปฏิเสธสำเร็จ', 'ยกเลิกรายการและคืนหัวใจสู่ระบบผู้ใช้แล้ว');
                                        fetchWithdrawals();
                                        fetchUsers();
                                      } else {
                                        const err = await res.json();
                                        triggerAlert('ผิดพลาด', err.error || 'ไม่สามารถดำเนินการได้');
                                      }
                                    }}
                                  >
                                    ปฏิเสธ
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted">ประมวลผลแล้ว</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {withdrawalList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted" style={{ padding: '20px' }}>ไม่มีข้อมูลรายการเบิกถอนหัวใจ</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
      
      {/* Premium Alert/Confirm Dialog */}
      {modalConfig.show && (
        <div className="modal active" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', background: 'rgba(15, 18, 36, 0.95)', backdropFilter: 'blur(20px)' }}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalConfig.type === 'confirm' ? '❓ ยืนยันการดำเนินการ' : '📢 แจ้งเตือน'}
              </h3>
              <button className="btn-close" onClick={() => setModalConfig({ ...modalConfig, show: false })}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px 0', fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>
              {modalConfig.message}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              {modalConfig.type === 'confirm' && (
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setModalConfig({ ...modalConfig, show: false })}
                >
                  ยกเลิก
                </button>
              )}
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setModalConfig({ ...modalConfig, show: false });
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
              >
                {modalConfig.type === 'confirm' ? 'ตกลง' : 'รับทราบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
