'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import defaultSettings from '@/src/defaultSettings';
import '../admin/admin.css';


export default function StreamerDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [widgets, setWidgets] = useState<any[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalAmount: 0, successCount: 0, rate: 0, pending: 0, failed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inspectTx, setInspectTx] = useState(null);
  const [obsUrl, setObsUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // SaaS States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [activeUser, setActiveUser] = useState<any>(null);
  const [withdrawalList, setWithdrawalList] = useState<any[]>([]);
  
  // KYC Form State
  const [kycBankName, setKycBankName] = useState('');
  const [kycBankNumber, setKycBankNumber] = useState('');
  const [kycBankHolder, setKycBankHolder] = useState('');
  const [kycDocUrl, setKycDocUrl] = useState('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500'); // default mockup document link
  
  // Withdrawal Form State
  const [withdrawCoins, setWithdrawCoins] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Settings Form State
  const [orientation, setOrientation] = useState('landscape');
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

  const [messageTemplate, setMessageTemplate] = useState('{donor} ได้ส่งหัวใจ {amount} ดวง! 🎉');
  const [showDonorMessage, setShowDonorMessage] = useState(true);
  const [minAmount, setMinAmount] = useState(1);

  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(true);
  const [profanityReplaceStyle, setProfanityReplaceStyle] = useState('asterisks');
  const [profanityWords, setProfanityWords] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({ show: false, title: '', message: '', type: 'alert' });

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

  // Sync hostname and creatorId to OBS URL box
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedUserId) {
      setObsUrl(`${window.location.origin}/overlay?userId=${selectedUserId}`);
    }
  }, [selectedUserId]);

  const { data: session, status } = useSession();
  const router = useRouter();

  // Guard routing
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Handle selectedUserId lock for streamers
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any;
      if (u.role === 'streamer') {
        setSelectedUserId(u.id);
      }
    }
  }, [status, session]);

  // Fetch users list on mount
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const creators = data.users || [];
        setUsersList(creators);
        
        // Auto-select first user if none selected or if selected is system (invalid for streamer)
        if (creators.length > 0) {
          const uRole = (session?.user as any)?.role;
          const uId = (session?.user as any)?.id;
          
          if (status === 'authenticated' && uRole === 'streamer') {
            setSelectedUserId(uId);
            const userObj = creators.find((u: any) => u.id === uId);
            if (userObj) {
              setActiveUser(userObj);
            }
          } else {
            const currentValid = creators.some((u: any) => u.id === selectedUserId);
            if (!currentValid || selectedUserId === 'system') {
              setSelectedUserId(creators[0].id);
              setActiveUser(creators[0]);
            } else {
              const userObj = creators.find((u: any) => u.id === selectedUserId);
              if (userObj) {
                setActiveUser(userObj);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchWithdrawals = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/withdrawals?userId=${selectedUserId}`);
      if (res.ok) {
        const data = await res.json();
        setWithdrawalList(data.withdrawals || []);
      }
    } catch (e) {
      console.error('Error fetching withdrawals:', e);
    }
  };

  // Fetch stats, transactions, and settings on mount and whenever selectedUserId changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, session]);

  useEffect(() => {
    if (selectedUserId && selectedUserId !== 'system') {
      // Find active user object in cached list first
      const cachedUserObj = usersList.find((u: any) => u.id === selectedUserId);
      if (cachedUserObj) {
        setActiveUser(cachedUserObj);
      }
      fetchData();
      loadSettings();
      fetchWithdrawals();
    }
  }, [selectedUserId, usersList]);


  // Sync auto-refresh silently every 15 seconds
  useEffect(() => {
    if (!selectedUserId || selectedUserId === 'system') return;
    const interval = setInterval(() => {
      fetchData();
      fetchWithdrawals();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedUserId]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchData = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/transactions?userId=${selectedUserId}`);
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
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/overlay/settings?userId=${selectedUserId}`);
      if (res.ok) {
        const s = await res.json();
        setOrientation(s.orientation || 'landscape');
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
        const rawWidgets = s.widgets || [];
        const merged = [...rawWidgets];
        defaultSettings.widgets.forEach((dw: any) => {
          if (!merged.some((w: any) => w.id === dw.id)) {
            merged.push(dw);
          }
        });
        setWidgets(merged);
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

  const handleCopyPageUrl = () => {
    if (!activeUser?.username) return;
    const url = `${window.location.origin}/${activeUser.username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPage(true);
      setTimeout(() => setCopiedPage(false), 2000);
    });
  };

  const handleInspect = (tx) => {
    setInspectTx(tx);
  };

  const handleCloseModal = () => {
    setInspectTx(null);
  };

  const handleSimulateAlert = async (tx) => {
    if (!selectedUserId) return;
    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor: tx.donor,
          amount: tx.amount,
          message: tx.message,
          creatorId: selectedUserId
        })
      });
    } catch (err) {
      console.error('Simulate alert call failed:', err);
    }
  };

  const triggerRandomTestAlert = async () => {
    if (!selectedUserId) return;
    const names = ['สมศักดิ์ รักเรียน', 'แม่ค้าออนไลน์สายลุย', 'น้องเป็ดก้าบๆ 🐤', 'สุดหล่อคีย์บอร์ดเรืองแสง', 'SuraGaming 🎮', 'นินจานักพัฒนา', 'ผู้สนับสนุนลึกลับ'];
    const messages = ['สู้ๆ นะครับพี่! เป็นกำลังใจให้ทุกไลฟ์เลย 💪', 'ขอเพลงสากลชิลๆ เพลงนึงค่าา 🎵', 'ระบบใหม่เฟี้ยวเงาะมากครับ! ✨', 'ส่งกำลังใจค่าน้ำเก๊กฮวยเย็นๆ ครับผม 🍺', 'พัฒนาต่อไปครับ ชอบเว็บนี้มาก 🚀', '', 'สุดจัดปลัดบอก ขนาดปลัดลาออกยังต้องบอกว่าสุดจัด!'];
    const amounts = [50, 100, 250, 500, 1000, 2500, 5000];

    const donor = names[Math.floor(Math.random() * names.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];

    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          donor, 
          amount, 
          message,
          creatorId: selectedUserId
        })
      });
    } catch (e) {
      console.error('Failed to trigger test alert:', e);
    }
  };

  const triggerAlert = (title: string, message: string) => {
    setModalConfig({ show: true, title, message, type: 'alert' });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ show: true, title, message, type: 'confirm', onConfirm });
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

  // Drag and Drop Canvas Layout handlers
  const handleWidgetMouseDown = (e: any, id: string) => {
    e.preventDefault();
    setSelectedWidgetId(id);
    setDraggedWidgetId(id);

    const w = widgets.find((x: any) => x.id === id);
    if (!w) return;

    // Calculate mouse click offset relative to the widget's scaled top-left position
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const scaledX = w.x * 0.4;
    const scaledY = w.y * 0.4;

    setDragStartOffset({
      x: clickX - scaledX,
      y: clickY - scaledY
    });
  };

  const handleCanvasMouseMove = (e: any) => {
    if (!draggedWidgetId) return;

    const w = widgets.find((x: any) => x.id === draggedWidgetId);
    if (!w) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new scaled coordinates
    let newScaledX = mouseX - dragStartOffset.x;
    let newScaledY = mouseY - dragStartOffset.y;

    // Scaled widget size
    const scaledW = w.width * 0.4;
    const scaledH = w.height * 0.4;

    // Bounds checking inside canvas grid (768x432 for landscape, 432x768 for portrait)
    const maxX = orientation === 'portrait' ? 432 : 768;
    const maxY = orientation === 'portrait' ? 768 : 432;
    if (newScaledX < 0) newScaledX = 0;
    if (newScaledY < 0) newScaledY = 0;
    if (newScaledX + scaledW > maxX) newScaledX = maxX - scaledW;
    if (newScaledY + scaledH > maxY) newScaledY = maxY - scaledH;

    // Convert back to 1920x1080 base
    const newX = Math.round(newScaledX / 0.4);
    const newY = Math.round(newScaledY / 0.4);

    setWidgets((prev: any) =>
      prev.map((item: any) => (item.id === draggedWidgetId ? { ...item, x: newX, y: newY } : item))
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggedWidgetId(null);
  };

  const handleWidgetSettingChange = (widgetId: string, key: string, value: any) => {
    setWidgets((prev: any) =>
      prev.map((w: any) => {
        if (w.id !== widgetId) return w;
        return {
          ...w,
          settings: {
            ...w.settings,
            [key]: value
          }
        };
      })
    );
  };

  const toggleWidgetEnabled = (widgetId: string, enabled: boolean) => {
    setWidgets((prev: any) =>
      prev.map((w: any) => (w.id === widgetId ? { ...w, enabled } : w))
    );
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUserId) return;

    const payload = {
      orientation,
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
      profanityReplaceStyle,
      widgets
    };

    try {
      const res = await fetch(`/api/overlay/settings?userId=${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerAlert('บันทึกสำเร็จ', '💾 บันทึกและซิงค์การตั้งค่าสำเร็จ! หน้าจอจำลองสดจะปรับดีไซน์ใหม่ทันที 🎉');
        reloadPreviewFrame();
      }
    } catch (err) {
      triggerAlert('ข้อผิดพลาด', '❌ ไม่สามารถบันทึกการตั้งค่าได้');
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

  // Handle empty state if no users exist
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#07090e',
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
          <p>กำลังตรวจสอบสิทธิ์แดชบอร์ด...</p>
        </div>
      </div>
    );
  }

  if (usersList.length === 0) {
    return (
      <div className="admin-wrapper" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#07090e' }}>
        <div className="dashboard-card" style={{ maxWidth: '600px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>ยังไม่มีบัญชีสตรีมเมอร์ในระบบ</h2>
          <p className="subtitle" style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '24px' }}>
            ตรวจพบว่าฐานข้อมูลระบบยังไม่มีข้อมูลสตรีมเมอร์ กรุณาเข้าไปที่ระบบแอดมิน เพื่อสมัครสตรีมเมอร์ใหม่ก่อนเริ่มต้นการใช้งานหน้าสตรีมเมอร์แดชบอร์ดนี้
          </p>
          <a href="/admin" className="admin-btn admin-btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 30px' }}>
            เข้าสู่ระบบ Admin เพื่อจัดการสตรีมเมอร์
          </a>
        </div>
      </div>
    );
  }


  return (
    <div className="admin-wrapper">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="brand" style={{ marginBottom: '20px' }}>
          <div className="brand-logo"><span className="heart-icon heart-md" /></div>
          <div className="brand-text">
            <h2>Streamer Portal</h2>
            <span>Dashboard Panel</span>
          </div>
        </div>

        {/* Streamer Selector - only shown to Admins */}
        {session?.user && (session.user as any).role === 'admin' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เลือกบัญชีสตรีมเมอร์ (สิทธิ์แอดมิน)</label>
            <select 
              className="form-select" 
              value={selectedUserId} 
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setActiveTab('dashboard');
              }}
              style={{ marginTop: '6px', background: '#0e111a', borderColor: '#1f293d', color: '#ffffff', fontSize: '13px' }}
            >
              {usersList.map((u: any) => (
                <option key={u.id} value={u.id}>🎮 {u.display_name || u.username} ({u.username})</option>
              ))}
            </select>
          </div>
        )}


        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="icon">📊</span> แดชบอร์ดภาพรวม
          </button>
          <button
            className={`menu-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className="icon">💖</span> ประวัติการรับหัวใจ
          </button>
          <button
            className={`menu-item ${activeTab === 'overlay-config' ? 'active' : ''}`}
            onClick={() => setActiveTab('overlay-config')}
          >
            <span className="icon">🎨</span> ตั้งค่ากล่องแจ้งเตือน
          </button>
          <button
            className={`menu-item ${activeTab === 'canvas-layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('canvas-layout')}
          >
            <span className="icon">📐</span> จัดวางพิกัดจอ (Canvas)
          </button>
          <button
            className={`menu-item ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            <span className="icon">💼</span> กระเป๋าเงิน & เบิกถอน
          </button>
        </nav>


        <div className="sidebar-footer">
          <p>Streamer Status: <span className="status-indicator online"></span> Online</p>
          <span className="version">v2.0.0 (SaaS Multi-Tenant)</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top header bar */}
        <header className="main-header">
          <div className="header-left">
            <h1>
              {activeTab === 'dashboard' && 'แดชบอร์ดภาพรวม (Streamer Dashboard)'}
              {activeTab === 'transactions' && 'ประวัติการรับหัวใจ (Hearts History)'}
              {activeTab === 'wallet' && 'กระเป๋าเงิน & การเบิกเงิน (Wallet & Redeems)'}
              {activeTab === 'overlay-config' && 'ปรับแต่งรูปแบบการแจ้งเตือน (Overlay Settings)'}
              {activeTab === 'canvas-layout' && 'ตำแหน่งกล่อง Widgets บนหน้าจอไลฟ์สด (Layout Canvas)'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'สถิติยอดรับหัวใจสนับสนุนและประวัติธุรกรรมล่าสุด'}
              {activeTab === 'transactions' && 'รายการส่งหัวใจสนับสนุนทั้งหมดของคุณ'}
              {activeTab === 'wallet' && 'ตรวจสอบยอดหัวใจสะสม ส่งคำขอเบิกเงินจริง และผูกบัญชีธนาคารเพื่อรับเงิน'}
              {activeTab === 'overlay-config' && 'ปรับแต่งดีไซน์ รูปแบบ เสียง และข้อความเตือนของ OBS Stream แบบเรียลไทม์'}
              {activeTab === 'canvas-layout' && 'ลากจำลองตำแหน่งกล่อง Widgets บนจอไลฟ์สดจริง 1920x1080 หรือ 1080x1920'}
            </p>
          </div>
          <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {activeUser && (
              <a 
                href={`/${activeUser.username}`} 
                target="_blank" 
                rel="noreferrer" 
                className="admin-btn admin-btn-secondary" 
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🔗 หน้าส่งหัวใจสตรีมเมอร์
              </a>
            )}
            {session?.user && (session.user as any).role === 'admin' && (
              <a 
                href="/admin" 
                className="admin-btn admin-btn-secondary" 
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#c084fc' }}
              >
                👑 แผงควบคุมแอดมิน
              </a>
            )}
            <button className="admin-btn admin-btn-primary" onClick={triggerRandomTestAlert}>
              ⚡ ยิง Quick Alert
            </button>
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
                  <div className="stat-icon amount" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="heart-icon heart-lg" />
                  </div>
                  <div className="stat-info">
                    <h3>ยอดหัวใจที่ได้รับสะสม</h3>
                    <h2>{(stats.totalAmount).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>ดวง</span></h2>
                    <span className="stat-trend success">ได้รับหัวใจสำเร็จ</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon count">✅</div>
                  <div className="stat-info">
                    <h3>จำนวนการส่งสำเร็จ (ครั้ง)</h3>
                    <h2>{stats.successCount.toLocaleString()}</h2>
                    <span className="stat-label">Transactions Completed</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon rate">📈</div>
                  <div className="stat-info">
                    <h3>อัตราการทำรายการสำเร็จ</h3>
                    <h2>{stats.rate}%</h2>
                    <span className="stat-label">Success Rate Ratio</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon pending">⌛</div>
                  <div className="stat-info">
                    <h3>รายการรอชำระ / ล้มเหลว</h3>
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
                    <h3>รายการส่งหัวใจล่าสุด (Recent Transactions)</h3>
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
                          <th>จำนวนหัวใจ</th>
                          <th>ข้อความ</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((t: any) => (
                          <tr key={t.id}>
                            <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('th-TH') : '-'}</td>
                            <td style={{ fontWeight: 500 }}>{t.donor || 'Anonymous'}</td>
                            <td style={{ fontWeight: 600, color: '#818cf8' }}>
                              {(Number(t.amount) || 0).toLocaleString()}{' '}
                              <span className="heart-icon heart-xs" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '3px' }} />
                            </td>
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

                {/* Setup & Links Card */}
                <div className="dashboard-card card-small">
                  <div className="card-header">
                    <h3>🎬 จัดการลิงก์และช่องทางการสตรีม</h3>
                  </div>
                  <div className="obs-setup-box">
                    {/* Copy Link to Donate Page */}
                    <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>🔗 ลิงก์หน้าส่งหัวใจสนับสนุนของคุณ:</p>
                    <div className="copy-url-group" style={{ marginBottom: '18px' }}>
                      <input type="text" readOnly value={activeUser ? `${window.location.origin}/${activeUser.username}` : ''} />
                      <button className="admin-btn admin-btn-secondary" style={{ minWidth: '80px' }} onClick={handleCopyPageUrl}>
                        {copiedPage ? '✓ Copied' : 'คัดลอก'}
                      </button>
                    </div>

                    {/* Copy OBS Browser Source Link */}
                    <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>🎬 คัดลอก URL Browser Source สำหรับโปรแกรม OBS:</p>
                    <div className="copy-url-group">
                      <input type="text" readOnly value={obsUrl || 'loading...'} />
                      <button className="admin-btn admin-btn-primary" style={{ minWidth: '80px' }} onClick={handleCopyObsUrl}>
                        {copied ? '✓ Copied' : 'คัดลอก'}
                      </button>
                    </div>
                    <div className="instructions-steps" style={{ marginTop: '12px', fontSize: '12px' }}>
                      <div className="step-num">1</div>
                      <p>เปิดโปรแกรม OBS -&gt; กดเครื่องหมาย + ในช่อง Sources</p>
                      
                      <div className="step-num">2</div>
                      <p>เลือก Browser ตั้งชื่อเป็น "Alert Box"</p>
                      
                      <div className="step-num">3</div>
                      <p>วาง URL Browser Source ด้านบนในช่อง URL</p>
                      
                      <div className="step-num">4</div>
                      <p>ตั้งค่าสเกลหน้าจอใน OBS: กว้าง: <b>{orientation === 'portrait' ? '1080' : '1920'}</b>, สูง: <b>{orientation === 'portrait' ? '1920' : '1080'}</b></p>
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
                        <th>จำนวนหัวใจ</th>
                        <th>ข้อความ</th>
                        <th>สถานะ</th>
                        <th>การจัดการ / ทดสอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((t: any) => (
                        <tr key={t.id}>
                          <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('th-TH') : '-'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{t.id}</td>
                          <td style={{ fontWeight: 600 }}>{t.donor || 'Anonymous'}</td>
                          <td style={{ fontWeight: 700, color: '#818cf8' }}>
                            {(Number(t.amount) || 0).toLocaleString()}{' '}
                            <span className="heart-icon heart-xs" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '3px' }} />
                          </td>
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

          {/* SECTION: WALLET & PAYOUT */}
          {activeTab === 'wallet' && activeUser && (
            <div className="tab-content active">
              <div className="settings-grid">
                
                {/* Left Panel: Wallet Info & Actions */}
                <div className="settings-panel-scroll">
                  
                  {/* Balance Display */}
                  <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>ยอดหัวใจสะสมในกระเป๋า (Wallet)</span>
                        <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#ffffff', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(activeUser?.coin_balance || 0).toLocaleString()} 
                          <span style={{ fontSize: '18px', color: '#a855f7', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ดวง <span className="heart-icon heart-md" />
                          </span>
                        </h2>
                        <span className="text-muted" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>* อัตรา 1 ดวง = 1 บาท</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>สถานะบัญชีการเบิกเงิน (KYC)</span>
                        <div style={{ marginTop: '6px' }}>
                          {activeUser?.kyc_status === 'approved' && <span className="badge badge-success">KYC อนุมัติแล้ว</span>}
                          {activeUser?.kyc_status === 'pending' && <span className="badge badge-pending">รอตรวจสอบเอกสาร</span>}
                          {activeUser?.kyc_status === 'rejected' && <span className="badge badge-failed">เอกสารถูกปฏิเสธ</span>}
                          {(activeUser?.kyc_status === 'unsubmitted' || !activeUser?.kyc_status) && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>ยังไม่ยื่นเอกสาร</span>}
                        </div>
                      </div>
                    </div>
                    {activeUser?.kyc_status === 'rejected' && (
                      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.15)', fontSize: '12.5px', color: '#f87171' }}>
                        ⚠️ <b>สาเหตุที่ปฏิเสธ:</b> {activeUser?.kyc_rejection_reason || 'เอกสารไม่ชัดเจน'}
                      </div>
                    )}
                  </div>

                  {/* KYC Verification Form */}
                  {activeUser?.kyc_status !== 'approved' && activeUser?.kyc_status !== 'pending' && (
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>📝 ยื่นเอกสาร KYC & ผูกบัญชีธนาคารรับเงิน</h4>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!kycBankName || !kycBankNumber || !kycBankHolder) {
                          triggerAlert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลธนาคารให้ครบถ้วน');
                          return;
                        }
                        try {
                          const res = await fetch('/api/users/kyc', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: selectedUserId,
                              bankName: kycBankName,
                              bankAccountNumber: kycBankNumber,
                              bankAccountHolder: kycBankHolder
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            triggerAlert('สำเร็จ', data.message);
                            fetchUsers();
                          } else {
                            triggerAlert('ข้อผิดพลาด', data.error);
                          }
                        } catch (err: any) {
                          triggerAlert('ข้อผิดพลาด', err.message);
                        }
                      }}>
                        <div className="form-row">
                          <div className="form-group">
                            <label>เลือกธนาคาร</label>
                            <select className="form-select" value={kycBankName} onChange={(e) => setKycBankName(e.target.value)}>
                              <option value="">-- เลือกธนาคาร --</option>
                              <option value="กสิกรไทย (KBank)">กสิกรไทย (KBank)</option>
                              <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
                              <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
                              <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
                              <option value="กรุงศรีอยุธยา (BAY)">กรุงศรีอยุธยา (BAY)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>ชื่อบัญชีธนาคาร (ตรงกับบัตรประชาชน)</label>
                            <input type="text" className="form-control" placeholder="ชื่อ-นามสกุล..." value={kycBankHolder} onChange={(e) => setKycBankHolder(e.target.value)} />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>เลขที่บัญชีธนาคาร</label>
                            <input type="text" className="form-control" placeholder="เลขที่บัญชีรับเงิน..." value={kycBankNumber} onChange={(e) => setKycBankNumber(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>ลิงก์รูปถ่ายบัตรประชาชน (KYC Document)</label>
                            <input type="text" className="form-control" value={kycDocUrl} onChange={(e) => setKycDocUrl(e.target.value)} />
                          </div>
                        </div>
                        <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                          ส่งเอกสารขออนุมัติ KYC
                        </button>
                      </form>
                    </div>
                  )}

                  {/* KYC Pending Message */}
                  {activeUser?.kyc_status === 'pending' && (
                    <div className="dashboard-card" style={{ textAlign: 'center', padding: '30px' }}>
                      <span style={{ fontSize: '32px' }}>⏳</span>
                      <h4 style={{ marginTop: '10px', color: '#ffffff' }}>เอกสารอยู่ระหว่างการรอตรวจสอบ</h4>
                      <p className="subtitle" style={{ marginTop: '6px' }}>แอดมินระบบกำลังตรวจสอบข้อมูลบัญชีและรูปถ่ายของคุณ โดยปกติจะเสร็จสิ้นภายใน 24 ชม.</p>
                    </div>
                  )}

                  {/* Withdrawal Form (Only if Approved) */}
                  {activeUser?.kyc_status === 'approved' && (
                    <div className="dashboard-card settings-card">
                      <div className="settings-card-header">
                        <h4>💸 ดำเนินการเบิกเงินคืน (Redeem Hearts)</h4>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!withdrawCoins || Number(withdrawCoins) <= 0) {
                          triggerAlert('ข้อผิดพลาด', 'กรุณาระบุจำนวนหัวใจที่ถูกต้อง');
                          return;
                        }
                        try {
                          const res = await fetch('/api/withdrawals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: selectedUserId,
                              coinAmount: Number(withdrawCoins)
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            triggerAlert('สำเร็จ', data.message);
                            setWithdrawCoins('');
                            fetchUsers();
                            fetchWithdrawals();
                          } else {
                            triggerAlert('ข้อผิดพลาด', data.error);
                          }
                        } catch (err: any) {
                          triggerAlert('ข้อผิดพลาด', err.message);
                        }
                      }}>
                        <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
                          🏦 <b>บัญชีรับเงินปลายทาง:</b> {activeUser?.bank_name} - เลขที่บัญชี: {activeUser?.bank_account_number} ({activeUser?.bank_account_holder})
                        </p>
                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                          <div className="form-group">
                            <label>ระบุจำนวนหัวใจที่ต้องการเบิกคืน</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              placeholder="เช่น 500" 
                              value={withdrawCoins} 
                              onChange={(e) => setWithdrawCoins(e.target.value)} 
                            />
                          </div>
                          <div className="form-group" style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            = ยอดที่จะได้รับเงินจริง: <b>฿{((Number(withdrawCoins) || 0) * 0.95).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b> <br/>
                            <small className="form-hint" style={{ color: '#ec4899', marginTop: '2px' }}>*หักค่าบริการแพลตฟอร์ม 5%</small>
                          </div>
                        </div>
                        <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                          ยื่นคำขอเบิกเงินจริง
                        </button>
                      </form>
                    </div>
                  )}

                </div>

                {/* Right Panel: Payout History */}
                <div className="settings-preview-panel">
                  <div className="dashboard-card">
                    <div className="card-header">
                      <h3>📋 ประวัติการเบิกเงินคืน (Withdrawal History)</h3>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>วันยื่นคำขอ</th>
                            <th>หัวใจที่เบิก</th>
                            <th>ยอดเงินที่โอน</th>
                            <th>สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawalList.map((w: any) => (
                            <tr key={w.id}>
                              <td>{new Date(w.created_at).toLocaleDateString('th-TH')}</td>
                              <td style={{ fontWeight: 600 }}>
                                {Number(w.coin_amount).toLocaleString()}{' '}
                                <span className="heart-icon heart-xs" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '3px' }} />
                              </td>
                              <td style={{ fontWeight: 700, color: '#818cf8' }}>฿{Number(w.payout_amount).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${w.status === 'approved' ? 'badge-success' : w.status === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                                  {w.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {withdrawalList.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">ยังไม่เคยมีรายการเบิกถอนเงิน</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

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
                        <div className="form-group full-width">
                          <label htmlFor="orientationSelect">ทิศทางการแสดงผลหน้าจอ (Screen Orientation)</label>
                          <select
                            id="orientationSelect"
                            className="form-select"
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                          >
                            <option value="landscape">แนวนอน (Landscape - 1920x1080) สำหรับ PC / OBS แนวนอน</option>
                            <option value="portrait">แนวตั้ง (Portrait - 1080x1920) สำหรับมือถือ / TikTok / Shorts</option>
                          </select>
                        </div>
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
                            <span className="switch-label">💡 เปิดอ่านข้อความส่งกำลังใจอัตโนมัติ (TTS)</span>
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
                          <small className="form-hint">ใช้ <code>{'{donor}'}</code> แทนชื่อผู้ส่งกำลังใจ และ <code>{'{amount}'}</code> แทนจำนวนหัวใจ</small>
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
                            <span className="switch-label">แสดงข้อความแนบของผู้ส่งกำลังใจด้านล่างตัวเลข</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group full-width">
                          <label htmlFor="inputMinAmount">จำนวนยอดขั้นต่ำที่จะให้แจ้งเตือนบนจอ (ดวง)</label>
                          <input
                            type="number"
                            id="inputMinAmount"
                            className="form-control"
                            min="1"
                            value={minAmount}
                            onChange={(e) => setMinAmount(parseInt(e.target.value) || 1)}
                          />
                          <small className="form-hint">ยอดส่งกำลังใจที่ต่ำกว่านี้จะบันทึกเข้าระบบ แต่จะไม่โชว์กล่องเตือนบนจอไลฟ์สด</small>
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
                    <div className="preview-iframe-wrapper" style={{ aspectRatio: orientation === 'portrait' ? '9 / 16' : '16 / 9', maxWidth: orientation === 'portrait' ? '300px' : 'none', margin: '0 auto' }}>
                      {selectedUserId && (
                        <iframe
                          ref={iframeRef}
                          src={`/overlay?userId=${selectedUserId}`}
                          id="overlayPreviewIframe"
                          className="preview-iframe"
                          allow="autoplay"
                          title="Live Overlay Preview"
                        />
                      )}
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

          {/* SECTION: CANVAS LAYOUT EDITOR */}
          {activeTab === 'canvas-layout' && (
            <div className="tab-content active">
              <div className="canvas-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
                
                {/* 1. The Interactive Board Grid */}
                <div className="dashboard-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>🖥️ บอร์ดจำลองหน้าจอไลฟ์สตรีม ({orientation === 'portrait' ? '9:16 Scale Grid: 1080x1920' : '16:9 Scale Grid: 1920x1080'})</h3>
                    <span style={{ fontSize: '12px', background: '#1e293b', padding: '4px 10px', borderRadius: '20px', color: '#94a3b8' }}>
                      ความละเอียดจริง: {orientation === 'portrait' ? '1080 x 1920' : '1920 x 1080'} px (จำลองสเกล 0.4x)
                    </span>
                  </div>

                  <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
                    💡 <b>วิธีการใช้งาน:</b> คลิกเลือกกล่อง Widget ด้านขวา หรือกดคลิกตรงกล่องบนหน้าจอนี้ จากนั้นใช้เมาส์คลิกค้างเพื่อ <b>ลาก-ย้ายตำแหน่งพิกัด (Drag & Drop)</b> ได้อย่างอิสระ ทุกตำแหน่งและสเกลจะซิงค์กับ OBS อัตโนมัติ!
                  </p>

                  <div 
                    className="visual-canvas-grid" 
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    style={{ 
                      position: 'relative', 
                      width: orientation === 'portrait' ? '432px' : '768px', 
                      height: orientation === 'portrait' ? '768px' : '432px', 
                      background: '#090d16', 
                      backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                      border: '2px dashed #475569', 
                      borderRadius: '8px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                      margin: '0 auto',
                      userSelect: 'none'
                    }}
                  >
                    {/* Simulated Stream Wallpaper/Grid overlay */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', color: 'rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'none' }}>
                      SIMULATED LIVE STREAM VIEWPORT
                    </div>

                    {/* Loop widgets inside canvas */}
                    {widgets.map((w: any) => {
                      // Calculate simulated width and height
                      const simX = w.x * 0.4;
                      const simY = w.y * 0.4;
                      const simW = w.width * 0.4;
                      const simH = w.height * 0.4;

                      const isSelected = selectedWidgetId === w.id;

                      const boxStyle = {
                        position: 'absolute' as 'absolute',
                        left: `${simX}px`,
                        top: `${simY}px`,
                        width: `${simW}px`,
                        height: `${simH}px`,
                        transform: `scale(${w.scale})`,
                        transformOrigin: 'top left',
                        cursor: draggedWidgetId === w.id ? 'grabbing' : 'grab',
                        border: isSelected ? '2px solid #6366f1' : w.enabled ? '1px solid rgba(255, 255, 255, 0.25)' : '1px dashed rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(99, 102, 241, 0.25)' : w.enabled ? 'rgba(30, 41, 59, 0.75)' : 'rgba(30, 41, 59, 0.25)',
                        backdropFilter: 'blur(4px)',
                        boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.5)' : '0 4px 10px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column' as 'column',
                        justifyContent: 'center' as 'center',
                        alignItems: 'center' as 'center',
                        padding: '6px',
                        zIndex: isSelected ? 1000 : 10,
                        transition: draggedWidgetId === w.id ? 'none' : 'border 0.2s, background 0.2s, box-shadow 0.2s',
                        color: isSelected ? '#ffffff' : w.enabled ? '#cbd5e1' : '#64748b',
                        opacity: w.enabled ? 1 : 0.55
                      };

                      return (
                        <div 
                          key={w.id} 
                          style={boxStyle}
                          onMouseDown={(e) => handleWidgetMouseDown(e, w.id)}
                        >
                          {/* Widget icon emoji */}
                          <span style={{ fontSize: '16px', marginBottom: '2px', opacity: w.enabled ? 1 : 0.6 }}>
                            {w.id === 'donation-alert' && '💝'}
                            {w.id === 'donation-goal' && '🎯'}
                            {w.id === 'recent-donors' && '💖'}
                            {w.id === 'custom-banner' && '📢'}
                            {w.id === 'qr-code' && '📱'}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', lineHeight: 1.2 }}>
                            {w.name.split(' (')[0]} {!w.enabled && <span style={{ fontSize: '8px', color: '#ef4444', display: 'block', marginTop: '2px' }}>(ปิดอยู่)</span>}
                          </span>
                          {/* Scaled coordinates indicator */}
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: 'monospace' }}>
                            X:{w.x}, Y:{w.y}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save button block */}
                  <div style={{ marginTop: '25px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleSaveSettings(null)}
                      className="admin-btn admin-btn-primary" 
                      style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '8px' }}
                    >
                      💾 บันทึกและซิงค์การตั้งค่าบอร์ด
                    </button>
                    <button 
                      onClick={reloadPreviewFrame}
                      className="admin-btn admin-btn-secondary" 
                      style={{ padding: '10px 18px', fontSize: '14px', borderRadius: '8px' }}
                    >
                      🔄 รีเฟรชพรีวิว
                    </button>
                  </div>
                </div>

                {/* 2. Right Sidebar Configurator panel */}
                <div className="canvas-sidebar-config">
                  <div className="dashboard-card" style={{ padding: '20px', minHeight: '432px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid #1e293b', paddingBottom: '10px', marginBottom: '15px' }}>
                      ⚙️ ปรับแต่ง Widget เฉพาะตัว
                    </h3>

                    {/* If no widget is selected */}
                    {!selectedWidgetId && (
                      <div style={{ display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b', textAlign: 'center' }}>
                        <span style={{ fontSize: '32px', marginBottom: '10px' }}>🖱️</span>
                        <p style={{ fontSize: '13px', lineHeight: 1.4 }}>คลิกเลือกกล่อง Widget บนแผงบอร์ดซ้าย เพื่อเปิดตัวเลือกการตั้งค่าพิกัดและพารามิเตอร์</p>
                      </div>
                    )}

                    {/* If a widget is selected */}
                    {selectedWidgetId && (() => {
                      const selectedWidget = widgets.find(x => x.id === selectedWidgetId);
                      if (!selectedWidget) return null;

                      return (
                        <div className="widget-settings-form">
                          {/* Widget Header Info */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '15px', background: 'rgba(99, 102, 241, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                            <span style={{ fontSize: '20px' }}>
                              {selectedWidget.id === 'donation-alert' && '💝'}
                              {selectedWidget.id === 'donation-goal' && '🎯'}
                              {selectedWidget.id === 'recent-donors' && '💖'}
                              {selectedWidget.id === 'custom-banner' && '📢'}
                              {selectedWidget.id === 'qr-code' && '📱'}
                            </span>
                            <div>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>{selectedWidget.name}</h4>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>ID: {selectedWidget.id}</span>
                            </div>
                          </div>

                          {/* Enable/Disable Switch */}
                          <div className="form-group" style={{ marginBottom: '15px' }}>
                            <div className="switch-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={selectedWidget.enabled}
                                  onChange={(e) => toggleWidgetEnabled(selectedWidget.id, e.target.checked)}
                                />
                                <span className="slider-switch"></span>
                              </label>
                              <span className="switch-label" style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                                เปิดใช้งาน Widget นี้บนไลฟ์สด
                              </span>
                            </div>
                          </div>

                          {/* Basic Coordinates */}
                          <div className="coordinates-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div className="form-group">
                              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>พิกัดแกน X (px)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={selectedWidget.x}
                                min="0"
                                max={orientation === 'portrait' ? 1080 : 1920}
                                onChange={(e) => {
                                  const maxVal = orientation === 'portrait' ? 1080 : 1920;
                                  const val = Math.min(maxVal, Math.max(0, Number(e.target.value) || 0));
                                  setWidgets((prev: any) =>
                                    prev.map((item: any) => (item.id === selectedWidget.id ? { ...item, x: val } : item))
                                  );
                                }}
                              />
                            </div>
                            <div className="form-group">
                              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>พิกัดแกน Y (px)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={selectedWidget.y}
                                min="0"
                                max={orientation === 'portrait' ? 1920 : 1080}
                                onChange={(e) => {
                                  const maxVal = orientation === 'portrait' ? 1920 : 1080;
                                  const val = Math.min(maxVal, Math.max(0, Number(e.target.value) || 0));
                                  setWidgets((prev: any) =>
                                    prev.map((item: any) => (item.id === selectedWidget.id ? { ...item, y: val } : item))
                                  );
                                }}
                              />
                            </div>
                          </div>

                          {/* Dimensions & Scale */}
                          <div className="coordinates-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div className="form-group">
                              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>ความกว้าง (px)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={selectedWidget.width}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 100;
                                  setWidgets((prev: any) =>
                                    prev.map((item: any) => (item.id === selectedWidget.id ? { ...item, width: val } : item))
                                  );
                                }}
                              />
                            </div>
                            <div className="form-group">
                              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>ความสูง (px)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={selectedWidget.height}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 50;
                                  setWidgets((prev: any) =>
                                    prev.map((item: any) => (item.id === selectedWidget.id ? { ...item, height: val } : item))
                                  );
                                }}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>ขนาดสเกลภาพ (Scale: <span>{selectedWidget.scale.toFixed(1)}</span>x)</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0.5"
                              max="2.5"
                              step="0.1"
                              value={selectedWidget.scale}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setWidgets((prev: any) =>
                                  prev.map((item: any) => (item.id === selectedWidget.id ? { ...item, scale: val } : item))
                                );
                              }}
                            />
                          </div>

                          {/* Specific Settings for Donation Goal Widget */}
                          {selectedWidget.id === 'donation-goal' && selectedWidget.settings && (
                            <div className="widget-special-settings" style={{ marginTop: '20px', background: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                              <h4 className="section-divider" style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px solid #1f2937', paddingBottom: '6px' }}>🎯 ตั้งค่าเป้าหมายแคมเปญ</h4>
                              
                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>หัวข้อเป้าหมายสตรีม</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={selectedWidget.settings.title || ''}
                                  onChange={(e) => handleWidgetSettingChange('donation-goal', 'title', e.target.value)}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>ยอดส่งกำลังใจเป้าหมาย (ดวง)</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={selectedWidget.settings.target || 0}
                                  onChange={(e) => handleWidgetSettingChange('donation-goal', 'target', Number(e.target.value))}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <div className="switch-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label className="switch">
                                    <input
                                      type="checkbox"
                                      checked={selectedWidget.settings.autoCalculate !== false}
                                      onChange={(e) => handleWidgetSettingChange('donation-goal', 'autoCalculate', e.target.checked)}
                                    />
                                    <span className="slider-switch"></span>
                                  </label>
                                  <span className="switch-label" style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    คำนวณยอดเงินรวมจาก Database อัตโนมัติ
                                  </span>
                                </div>
                              </div>

                              {!selectedWidget.settings.autoCalculate && (
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>ยอดสะสมปัจจุบัน (ระบุเอง)</label>
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={selectedWidget.settings.current || 0}
                                    onChange={(e) => handleWidgetSettingChange('donation-goal', 'current', Number(e.target.value))}
                                  />
                                </div>
                              )}

                              <div className="form-group">
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>สีหลักของแถบสะสม</label>
                                <div className="color-input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    type="color"
                                    value={selectedWidget.settings.color || '#10b981'}
                                    onChange={(e) => handleWidgetSettingChange('donation-goal', 'color', e.target.value)}
                                    style={{ height: '38px', width: '48px', border: '1px solid #374151', borderRadius: '6px' }}
                                  />
                                  <input
                                    type="text"
                                    className="hex-text"
                                    value={selectedWidget.settings.color || '#10b981'}
                                    onChange={(e) => handleWidgetSettingChange('donation-goal', 'color', e.target.value)}
                                    style={{ flex: 1, background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151', borderRadius: '6px', padding: '8px' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Specific Settings for Recent Donors Widget */}
                          {selectedWidget.id === 'recent-donors' && selectedWidget.settings && (
                            <div className="widget-special-settings" style={{ marginTop: '20px', background: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                              <h4 className="section-divider" style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px solid #1f2937', paddingBottom: '6px' }}>💖 ตั้งค่ากล่องคนส่งกำลังใจล่าสุด</h4>
                              
                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>หัวข้อของกล่อง Widget</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={selectedWidget.settings.title || ''}
                                  onChange={(e) => handleWidgetSettingChange('recent-donors', 'title', e.target.value)}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>รูปแบบการแสดงผล</label>
                                <select
                                  className="form-select"
                                  value={selectedWidget.settings.displayMode || 'list'}
                                  onChange={(e) => {
                                    const mode = e.target.value;
                                    handleWidgetSettingChange('recent-donors', 'displayMode', mode);
                                    // Automatically adjust dimensions to fit horizontal bar vs vertical box
                                    if (mode === 'bar') {
                                      setWidgets((prev: any) =>
                                        prev.map((item: any) => (item.id === 'recent-donors' ? { ...item, width: 800, height: 50 } : item))
                                      );
                                    } else {
                                      setWidgets((prev: any) =>
                                        prev.map((item: any) => (item.id === 'recent-donors' ? { ...item, width: 400, height: 350 } : item))
                                      );
                                    }
                                  }}
                                  style={{ background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151', borderRadius: '6px', padding: '8px', width: '100%', outline: 'none' }}
                                >
                                  <option value="list">กล่องแนวตั้ง (Vertical List Box)</option>
                                  <option value="bar">แถบวิ่งแนวนอน (Horizontal Ticker Bar)</option>
                                </select>
                              </div>

                              {(selectedWidget.settings.displayMode === 'bar') && (
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>เอฟเฟกต์การเคลื่อนไหว</label>
                                  <select
                                    className="form-select"
                                    value={selectedWidget.settings.animationType || 'marquee'}
                                    onChange={(e) => handleWidgetSettingChange('recent-donors', 'animationType', e.target.value)}
                                    style={{ background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151', borderRadius: '6px', padding: '8px', width: '100%', outline: 'none' }}
                                  >
                                    <option value="marquee">เลื่อนสไลด์จากขวาไปซ้าย (Marquee Ticker)</option>
                                    <option value="fade-slide-up">ผุดขึ้นมาจากข้างล่างทีละชื่อ (Slide Up News)</option>
                                  </select>
                                </div>
                              )}

                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>แสดงรายชื่อสูงสุด (จำนวนคน)</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="1"
                                  max="15"
                                  value={selectedWidget.settings.limit || 5}
                                  onChange={(e) => handleWidgetSettingChange('recent-donors', 'limit', Number(e.target.value))}
                                />
                              </div>

                              <div className="form-group">
                                <div className="switch-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label className="switch">
                                    <input
                                      type="checkbox"
                                      checked={selectedWidget.settings.showAmount !== false}
                                      onChange={(e) => handleWidgetSettingChange('recent-donors', 'showAmount', e.target.checked)}
                                    />
                                    <span className="slider-switch"></span>
                                  </label>
                                  <span className="switch-label" style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    แสดงยอดหัวใจที่ส่งกำลังใจแนบรายชื่อด้วย
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Specific Settings for Custom Banner Widget */}
                          {selectedWidget.id === 'custom-banner' && selectedWidget.settings && (
                            <div className="widget-special-settings" style={{ marginTop: '20px', background: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                              <h4 className="section-divider" style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px solid #1f2937', paddingBottom: '6px' }}>📢 ตั้งค่ากล่องข้อความประชาสัมพันธ์</h4>
                              
                              <div className="form-group">
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px' }}>รหัสโค้ด HTML หรือข้อความธรรมดา (รองรับ Inline CSS)</label>
                                <textarea
                                  className="form-control"
                                  rows={6}
                                  value={selectedWidget.settings.html || ''}
                                  onChange={(e) => handleWidgetSettingChange('custom-banner', 'html', e.target.value)}
                                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', background: '#1f2937', color: '#34d399', border: '1px solid #374151', borderRadius: '6px', padding: '8px' }}
                                />
                                <small className="form-hint" style={{ display: 'block', color: '#9ca3af', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 }}>
                                  * คุณสามารถเขียนสไตล์ระบุขนาดฟอนต์ สี แสงเงา เพื่อจัดความสวยงามได้ตามชอบ
                                </small>
                              </div>
                            </div>
                          )}

                          {/* Specific Settings for QR Code Widget */}
                          {selectedWidget.id === 'qr-code' && selectedWidget.settings && (
                            <div className="widget-special-settings" style={{ marginTop: '20px', background: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                              <h4 className="section-divider" style={{ fontSize: '13px', fontWeight: 700, color: '#eab308', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px solid #1f2937', paddingBottom: '6px' }}>📱 ตั้งค่ากล่องสแกนคิวอาร์โค้ด</h4>
                              
                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>หัวข้อ Widget (ข้อความแนะนำ)</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={selectedWidget.settings.title || ''}
                                  onChange={(e) => handleWidgetSettingChange('qr-code', 'title', e.target.value)}
                                />
                              </div>

                              <div className="form-group">
                                <div className="switch-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label className="switch">
                                    <input
                                      type="checkbox"
                                      checked={selectedWidget.settings.showLabel !== false}
                                      onChange={(e) => handleWidgetSettingChange('qr-code', 'showLabel', e.target.checked)}
                                    />
                                    <span className="slider-switch"></span>
                                  </label>
                                  <span className="switch-label" style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    แสดงหัวข้อด้านบนคิวอาร์โค้ด
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })()}
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
