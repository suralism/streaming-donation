'use client';

import { useEffect, useState, useRef } from 'react';
import './overlay.css';

import defaultSettings from '@/src/defaultSettings';

export default function OverlayPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [scale, setScale] = useState(1);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [particles, setParticles] = useState([]);
  const [activeRecentIdx, setActiveRecentIdx] = useState(0);

  const queueRef = useRef([]);
  const isShowingRef = useRef(false);
  const settingsRef = useRef(defaultSettings);

  // Interval for cycling recent donors sequentially (headline news-ticker style)
  useEffect(() => {
    const successfulTx = transactions.filter((tx: any) => tx.status === 'successful');
    if (successfulTx.length <= 1) {
      setActiveRecentIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setActiveRecentIdx((prev) => (prev + 1) % successfulTx.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [transactions]);

  // Sync settings ref
  useEffect(() => {
    settingsRef.current = settings;
    applyStyleProperties(settings);
  }, [settings]);

  // Adaptive viewport auto-scaling for preview mode / OBS custom aspect ratios
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const isPortrait = settings.orientation === 'portrait';
      const standardWidth = isPortrait ? 1080 : 1920;
      const standardHeight = isPortrait ? 1920 : 1080;
      
      const scaleX = viewportWidth / standardWidth;
      const scaleY = viewportHeight / standardHeight;
      
      // Standard scale to fit viewport completely
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale || 1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.orientation]);

  // Apply CSS Custom variables
  const applyStyleProperties = (s) => {
    const doc = document.documentElement;
    doc.style.setProperty('--primary-color', s.primaryColor);
    doc.style.setProperty('--secondary-color', s.secondaryColor);
    doc.style.setProperty('--bg-color', s.backgroundColor);
    doc.style.setProperty('--text-color', s.textColor);
    doc.style.setProperty('--border-color', s.borderColor);
    doc.style.setProperty('--font-family', `'${s.fontFamily}', 'Segoe UI', sans-serif`);
    doc.style.setProperty('--glow-color', hexToRgbA(s.primaryColor, 0.25));
    doc.style.setProperty('--font-size', `${s.fontSize || 32}px`);
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

  // Profanity Filter Helper
  const filterProfanity = (text, currentSettings) => {
    if (!text || !currentSettings.profanityFilterEnabled) return text;
    
    let censoredText = text;
    const wordsStr = currentSettings.profanityWords || '';
    const words = wordsStr
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    if (words.length === 0) return text;
    
    // 1. Block whole message
    if (currentSettings.profanityReplaceStyle === 'block') {
      const hasProfanity = words.some(w => censoredText.toLowerCase().includes(w.toLowerCase()));
      if (hasProfanity) {
        return '[ข้อความไม่เหมาะสม ถูกบล็อกโดยระบบ]';
      }
    }

    // 2. Censor/Polite replace
    words.forEach(word => {
      const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      
      if (currentSettings.profanityReplaceStyle === 'polite') {
        const politeReplacements = ['รักนะ', 'ชื่นชม', 'สู้ๆ', 'ยินดี', 'ขอบคุณ'];
        censoredText = censoredText.replace(regex, () => politeReplacements[Math.floor(Math.random() * politeReplacements.length)]);
      } else {
        censoredText = censoredText.replace(regex, (match) => '*'.repeat(match.length));
      }
    });

    return censoredText;
  };

  // Web Audio Synthesizer
  const audioCtxRef = useRef(null);
  const playNotificationSound = (soundChoice, volume) => {
    try {
      if (soundChoice === 'none') return;
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioCtx = audioCtxRef.current;
      const now = audioCtx.currentTime;
      
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(Number(volume) || 0.5, now);
      masterGain.connect(audioCtx.destination);

      if (soundChoice === 'chime') {
        const notes = [
          { freq: 587.33, start: 0, duration: 0.15 },
          { freq: 880.00, start: 0.12, duration: 0.25 },
          { freq: 1174.66, start: 0.28, duration: 0.35 }
        ];

        notes.forEach(note => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.freq, now + note.start);
          
          gainNode.gain.setValueAtTime(0, now + note.start);
          gainNode.gain.linearRampToValueAtTime(0.25, now + note.start + 0.03);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);
          
          osc.connect(gainNode);
          gainNode.connect(masterGain);
          
          osc.start(now + note.start);
          osc.stop(now + note.start + note.duration + 0.05);
        });
      } 
      else if (soundChoice === 'retro') {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25);
        
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        osc.start(now);
        osc.stop(now + 0.3);
      } 
      else if (soundChoice === 'modern') {
        const oscTypes = ['sine', 'triangle'];
        const freqs = [329.63, 392.00, 523.25, 659.25];
        
        freqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = oscTypes[idx % oscTypes.length];
          osc.frequency.setValueAtTime(freq, now);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + (idx * 0.1));
          
          osc.connect(gainNode);
          gainNode.connect(masterGain);
          
          osc.start(now);
          osc.stop(now + 1.0);
        });
      } 
      else if (soundChoice === 'bell') {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1567.98, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.8);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        osc.start(now);
        osc.stop(now + 0.9);
      }
    } catch (err) {
      console.warn('Audio synthesis failed:', err);
    }
  };

  // Google Translate TTS Proxy and browser fallback
  const speakMessage = (text, lang = 'th-TH', volume = 0.8, rate = 1.0, voiceName = 'default') => {
    try {
      const voices = window.speechSynthesis.getVoices();
      let voice = null;
      
      if (voiceName && voiceName !== 'default') {
        const targetName = voiceName.toLowerCase();
        voice = voices.find(v => v.name.toLowerCase().includes(targetName));
      }
      
      if (voice) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.volume = Number(volume) || 0.8;
        utterance.rate = Number(rate) || 1.0;
        
        window.speechSynthesis.speak(utterance);
        console.log('🗣️ Selected premium Edge TTS voice:', voice.name);
      } else {
        const shortLang = lang.split('-')[0] || 'th';
        const truncatedText = text.substring(0, 180);
        const encodedText = encodeURIComponent(truncatedText);
        const localTtsUrl = `/api/tts?lang=${shortLang}&text=${encodedText}`;
        
        console.log(`📣 No local premium voice found. Using local server TTS proxy (${shortLang}):`, truncatedText);
        
        const audio = new Audio(localTtsUrl);
        audio.volume = Number(volume) || 0.8;
        audio.defaultPlaybackRate = Number(rate) || 1.0;
        audio.playbackRate = Number(rate) || 1.0;
        
        audio.play()
          .then(() => {
            console.log('🗣️ Local TTS Proxy playing successfully:', truncatedText);
          })
          .catch(err => {
            console.warn('⚠️ TTS Proxy autoplay blocked, playing with browser default speech:', err.message);
            playDefaultWebSpeech(text, lang, volume, rate);
          });
      }
    } catch (err) {
      console.warn('⚠️ Speech engine error, playing with browser default speech:', err);
      playDefaultWebSpeech(text, lang, volume, rate);
    }
  };

  const playDefaultWebSpeech = (text, lang, volume, rate) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.volume = Number(volume) || 0.8;
      utterance.rate = Number(rate) || 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const targetLang = lang.toLowerCase().replace('_', '-');
      let voice = voices.find(v => {
        const voiceLang = v.lang.toLowerCase().replace('_', '-');
        return voiceLang === targetLang || voiceLang.startsWith(targetLang);
      });
      
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Final fallback speaking failed:', e);
    }
  };

  // Spark Visual Particles
  const spawnParticles = (particleCount = 12) => {
    const count = Number(particleCount) || 0;
    if (count <= 0) return;

    const colors = [
      settingsRef.current.primaryColor, 
      settingsRef.current.secondaryColor, 
      '#f093fb', 
      '#ffd700', 
      '#00f3ff'
    ];

    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const tx = (Math.random() - 0.5) * 180;
      const ty = (Math.random() - 0.7) * 140;
      const size = 4 + Math.random() * 5;

      newParticles.push({
        id: Math.random().toString(),
        left: `${150 + Math.random() * 200}px`,
        top: `${50 + Math.random() * 60}px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        tx: `${tx}px`,
        ty: `${ty}px`,
        width: `${size}px`,
        height: `${size}px`
      });
    }

    setParticles(newParticles);
    // Remove particles after 1s animation
    setTimeout(() => setParticles([]), 1000);
  };

  // Queue Processing Loop
  const processQueue = () => {
    if (isShowingRef.current || queueRef.current.length === 0) return;

    isShowingRef.current = true;
    const nextAlert = queueRef.current.shift();
    setCurrentAlert(nextAlert);
  };

  // Watch Current Alert transitions
  useEffect(() => {
    if (!currentAlert) return;

    setIsExiting(false);

    // 1. Play Sound
    if (settingsRef.current.soundEnabled) {
      playNotificationSound(settingsRef.current.soundChoice, settingsRef.current.soundVolume);
    }

    // 2. Play Speech (TTS)
    let ttsTimer;
    if (settingsRef.current.ttsEnabled) {
      const filteredDonor = filterProfanity(currentAlert.donor || 'Anonymous', settingsRef.current);
      const filteredMessage = filterProfanity(currentAlert.message || '', settingsRef.current);
      const speakText = `${filteredDonor} ส่งกำลังใจ ${currentAlert.amount} บาท. ${currentAlert.message ? `ฝากข้อความว่า ${filteredMessage}` : ''}`;
      
      ttsTimer = setTimeout(() => {
        speakMessage(speakText, settingsRef.current.ttsLanguage, settingsRef.current.ttsVolume, settingsRef.current.ttsRate, settingsRef.current.ttsVoice);
      }, 1200);
    }

    // 3. Spawn Particles
    const particleTimer = setTimeout(() => {
      spawnParticles(settingsRef.current.particleCount);
    }, 300);

    // 4. Timer to trigger Alert Exit transition
    const alertDurationMs = (Number(settingsRef.current.duration) || 8) * 1000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);

      // Timer to actually remove the alert and loop next
      setTimeout(() => {
        setCurrentAlert(null);
        isShowingRef.current = false;
        processQueue();
      }, 550); // transition time
    }, alertDurationMs);

    return () => {
      clearTimeout(ttsTimer);
      clearTimeout(particleTimer);
      clearTimeout(exitTimer);
    };
  }, [currentAlert]);

  // Load initial settings and subscribe to SSE Stream
  useEffect(() => {
    // Warm speech voices on load
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
      }
    }

    // Fetch initial settings
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/overlay/settings');
        if (res.ok) {
          const initialSettings = await res.json();
          setSettings(initialSettings);
        }
      } catch (e) {
        console.error('Error loading initial settings, using defaults.', e);
      }
    };

    const loadTransactions = async () => {
      try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
          const data = await res.json();
          const successful = data.filter((t: any) => t.status === 'successful');
          setTransactions(successful);
        }
      } catch (e) {
        console.error('Error loading initial transactions for widgets:', e);
      }
    };

    loadSettings();
    loadTransactions();

    // Setup SSE connection
    let eventSource;
    let reconnectAttempts = 0;
    const connect = () => {
      eventSource = new EventSource(`/api/alerts/stream`);

      eventSource.onopen = () => {
        console.log('✅ SSE Connected in OBS Overlay');
        reconnectAttempts = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('🔗 Overlay SSE Stream Active');
            return;
          }

          if (data.type === 'settings_update') {
            console.log('🔄 Live Settings update received:', data.settings);
            setSettings(data.settings);
            return;
          }

          if (data.type === 'donation') {
            const amount = Number(data.amount) || 0;
            // Access current value from settingsRef to avoid closure problems
            const minAmount = settingsRef.current.minAmount;
            if (amount < minAmount) {
              console.log(`⚠️ Donation filtered out (฿${amount} is below threshold ฿${minAmount})`);
              return;
            }

            console.log('💝 Queueing new donation alert:', data);
            queueRef.current.push(data);
            processQueue();

            // Prepend new donation to transactions list for live widgets update
            setTransactions(prev => {
              if (prev.some(t => t.id === data.id)) return prev;
              return [data, ...prev];
            });
          }
        } catch (err) {
          console.error('Error parsing SSE payload:', err);
        }
      };

      eventSource.onerror = () => {
        console.warn('⚠️ SSE stream disconnected. Retrying connection...');
        eventSource.close();
        
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Format alert details if active
  let amountFormatted = '';
  let filteredHeader = '';
  let filteredMessage = '';
  let shouldHideLabel = false;
  let labelText = '';
  let alertBoxClasses = '';

  if (currentAlert) {
    amountFormatted = Number(currentAlert.amount).toLocaleString('th-TH', { minimumFractionDigits: 0 });
    const messageTemplate = settings.messageTemplate || '{donor} ได้ส่งกำลังใจ {amount} บาท! 🎉';
    
    const headerText = messageTemplate
      .replace(/{donor}/g, currentAlert.donor || 'Anonymous')
      .replace(/{amount}/g, amountFormatted);

    filteredHeader = filterProfanity(headerText, settings);
    filteredMessage = filterProfanity(currentAlert.message || '', settings);

    // Check if we should hide the small alert label
    const tempLower = messageTemplate.toLowerCase();
    shouldHideLabel = tempLower.includes('{amount}') || tempLower.includes('บริจาค') || tempLower.includes('ส่งกำลังใจ') || tempLower.includes('donate');
    labelText = (settings.theme === 'cyberpunk' || settings.theme === 'minimal') ? 'PAY' : 'ส่งกำลังใจ';

    alertBoxClasses = [
      'alert-box',
      `theme-${settings.theme}`,
      `anim-${settings.animation}`,
      isExiting ? 'exit' : ''
    ].filter(Boolean).join(' ');
  }

  const activeWidgets = (settings as any).widgets || [];

  const isPortrait = settings.orientation === 'portrait';

  return (
    <div className="overlay-container" style={{
      position: 'absolute' as 'absolute',
      left: '50%',
      top: '50%',
      width: isPortrait ? '1080px' : '1920px',
      height: isPortrait ? '1920px' : '1080px',
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: 'center center',
      overflow: 'hidden',
      background: 'transparent'
    }}>
      
      {/* 1. RENDER DONATION ALERT WIDGET */}
      {(() => {
        const w = activeWidgets.find(x => x.id === 'donation-alert');
        if (!w || !w.enabled || !currentAlert) return null;

        const widgetStyle = {
          position: 'absolute' as 'absolute',
          left: `${w.x}px`,
          top: `${w.y}px`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          transform: `scale(${w.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto' as 'auto',
          zIndex: 9999
        };

        return (
          <div style={widgetStyle} id="alertContainer">
            <div className={alertBoxClasses}>
              <div className="alert-glow" />
              <div className="alert-content">
                <div className="alert-icon">
                  <span className="icon-emoji">💝</span>
                  <div className="icon-ring" />
                </div>
                <div className="alert-info">
                  <div className="alert-header">
                    <span className="donor-name">{filteredHeader}</span>
                    {!shouldHideLabel && <span className="alert-label">{labelText}</span>}
                  </div>
                  <div className="alert-amount">฿{amountFormatted}</div>
                  {settings.showDonorMessage && currentAlert.message && (
                    <div className="alert-message">{filteredMessage}</div>
                  )}
                </div>
              </div>
              <div className="alert-progress">
                <div 
                  className="alert-progress-bar"
                  style={{
                    animation: `progressShrink ${(Number(settings.duration) || 8) * 1000}ms linear forwards`
                  }}
                />
              </div>
            </div>

            {/* Render flying particles inside the alert box coordinates */}
            {particles.map((p: any) => (
              <div
                key={p.id}
                className="particle"
                style={{
                  left: p.left,
                  top: p.top,
                  backgroundColor: p.backgroundColor,
                  width: p.width,
                  height: p.height,
                  '--tx': p.tx,
                  '--ty': p.ty
                } as React.CSSProperties}
              />
            ))}
          </div>
        );
      })()}

      {/* 2. RENDER DONATION GOAL WIDGET */}
      {(() => {
        const w = activeWidgets.find(x => x.id === 'donation-goal');
        if (!w || !w.enabled) return null;

        const target = w.settings?.target || 5000;
        const autoCalculate = w.settings?.autoCalculate !== false;
        let current = w.settings?.current || 0;
        if (autoCalculate) {
          current = transactions
            .filter((tx: any) => tx.status === 'successful')
            .reduce((sum, tx: any) => sum + (Number(tx.amount) || 0), 0);
        }
        
        const percent = Math.min(100, Math.max(0, (current / target) * 100));
        const color = w.settings?.color || '#10b981';

        const widgetStyle = {
          position: 'absolute' as 'absolute',
          left: `${w.x}px`,
          top: `${w.y}px`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          transform: `scale(${w.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto' as 'auto'
        };

        return (
          <div style={widgetStyle} className={`widget-goal theme-${settings.theme}`}>
            <div className="goal-title-row">
              <span className="goal-title">{w.settings?.title || 'เป้าหมายสตรีม 🎯'}</span>
              <span className="goal-progress-text">฿{current.toLocaleString()} / ฿{target.toLocaleString()} ({percent.toFixed(0)}%)</span>
            </div>
            <div className="goal-bar-outer">
              <div 
                className="goal-bar-inner" 
                style={{ 
                  width: `${percent}%`, 
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}`
                }} 
              />
            </div>
          </div>
        );
      })()}

      {/* 3. RENDER RECENT DONORS WIDGET */}
      {(() => {
        const w = activeWidgets.find(x => x.id === 'recent-donors');
        if (!w || !w.enabled) return null;

        const limit = w.settings?.limit || 5;
        const showAmount = w.settings?.showAmount !== false;
        const list = transactions
          .filter((tx: any) => tx.status === 'successful')
          .slice(0, limit);

        const widgetStyle = {
          position: 'absolute' as 'absolute',
          left: `${w.x}px`,
          top: `${w.y}px`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          transform: `scale(${w.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto' as 'auto'
        };

        const displayMode = w.settings?.displayMode || 'list';
        const animationType = w.settings?.animationType || 'marquee';

        if (displayMode === 'bar') {
          return (
            <div style={widgetStyle} className={`widget-recent-bar theme-${settings.theme}`}>
              <div className="recent-bar-label">
                <span>💖 {w.settings?.title || 'ล่าสุด'}</span>
              </div>
              {animationType === 'marquee' ? (
                <div className="recent-marquee-container">
                  <div className="recent-marquee-content">
                    {list.map((tx: any, idx) => {
                      const amountFormatted = (Number(tx.amount) || 0).toLocaleString();
                      return (
                        <div key={tx.id || idx} className="recent-marquee-item">
                          <span>👤 {tx.donor || 'Anonymous'}</span>
                          {showAmount && <span className="recent-bar-amount">฿{amountFormatted}</span>}
                          {idx < list.length - 1 && <span style={{ opacity: 0.3, margin: '0 5px' }}>|</span>}
                        </div>
                      );
                    })}
                    {list.length === 0 && (
                      <span style={{ fontSize: '12px', opacity: 0.5, fontStyle: 'italic' }}>ยังไม่มีรายชื่อผู้ส่งกำลังใจ</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="recent-up-container">
                  {list.map((tx: any, idx) => {
                    const isActive = idx === (activeRecentIdx % Math.max(1, list.length));
                    if (!isActive) return null;
                    const amountFormatted = (Number(tx.amount) || 0).toLocaleString();
                    return (
                      <div key={tx.id || idx} className="recent-up-item anim-up">
                        <span>👤 {tx.donor || 'Anonymous'}</span>
                        {showAmount && <span className="recent-bar-amount">฿{amountFormatted}</span>}
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <span style={{ fontSize: '12px', opacity: 0.5, fontStyle: 'italic' }}>ยังไม่มีรายชื่อผู้ส่งกำลังใจ</span>
                  )}
                </div>
              )}
            </div>
          );
        }

        return (
          <div style={widgetStyle} className={`widget-recent theme-${settings.theme}`}>
            <div className="recent-header">
              <h4>{w.settings?.title || 'ผู้สนับสนุนล่าสุด 💖'}</h4>
            </div>
            <div className="recent-list">
              {list.map((tx: any, idx) => {
                const amountFormatted = (Number(tx.amount) || 0).toLocaleString();
                return (
                  <div key={tx.id || idx} className="recent-item">
                    <span className="recent-donor-name">{tx.donor || 'Anonymous'}</span>
                    {showAmount && <span className="recent-donor-amount">฿{amountFormatted}</span>}
                  </div>
                );
              })}
              {list.length === 0 && (
                <div className="recent-empty">ยังไม่มีรายชื่อผู้ส่งกำลังใจ</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 4. RENDER CUSTOM BANNER WIDGET */}
      {(() => {
        const w = activeWidgets.find(x => x.id === 'custom-banner');
        if (!w || !w.enabled) return null;

        const html = w.settings?.html || 'Welcome to the Stream!';

        const widgetStyle = {
          position: 'absolute' as 'absolute',
          left: `${w.x}px`,
          top: `${w.y}px`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          transform: `scale(${w.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto' as 'auto',
          overflow: 'hidden'
        };

        return (
          <div 
            style={widgetStyle} 
            className={`widget-custom theme-${settings.theme}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })()}

      {/* 5. RENDER QR CODE WIDGET */}
      {(() => {
        const w = activeWidgets.find(x => x.id === 'qr-code');
        if (!w || !w.enabled) return null;

        const donationUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:3000/';
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(donationUrl)}`;

        const widgetStyle = {
          position: 'absolute' as 'absolute',
          left: `${w.x}px`,
          top: `${w.y}px`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          transform: `scale(${w.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto' as 'auto'
        };

        return (
          <div style={widgetStyle} className={`widget-qr theme-${settings.theme}`}>
            {w.settings?.showLabel !== false && (
              <div className="qr-title-row">
                <span className="qr-title">{w.settings?.title || 'ส่งกำลังใจที่นี่ 💝'}</span>
              </div>
            )}
            <div className="qr-body">
              <img 
                src={qrImgUrl} 
                alt="Donation QR Code" 
                className="qr-image"
                style={{
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '1/1',
                  borderRadius: settings.theme === 'cyberpunk' ? '0px' : '8px',
                  border: settings.theme === 'cyberpunk' ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                  padding: '6px',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}
