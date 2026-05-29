'use client';

import { useEffect, useState, useRef } from 'react';
import './overlay.css';

// Initial / default settings
const defaultSettings = {
  duration: 8,
  soundEnabled: true,
  soundChoice: 'chime',
  soundVolume: 0.5,
  ttsEnabled: false,
  ttsVolume: 0.8,
  ttsRate: 1.0,
  ttsLanguage: 'th-TH',
  ttsVoice: 'default',
  profanityFilterEnabled: true,
  profanityWords: 'ควย, เย็ด, สัส, เหี้ย, หี, แตด, ล่อ, ดอกทอง, ส้นตีน, อีดอก, อีเหี้ย, พ่อง, แม่มึง, กู, มึง',
  profanityReplaceStyle: 'asterisks',
  messageTemplate: '{donor} ได้บริจาค {amount} บาท! 🎉',
  showDonorMessage: true,
  minAmount: 1,
  theme: 'glassmorphism',
  animation: 'slide-down',
  fontFamily: 'Noto Sans Thai',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  backgroundColor: 'rgba(15, 15, 25, 0.88)',
  textColor: '#ffffff',
  borderColor: 'rgba(255, 255, 255, 0.25)',
  particleCount: 15,
  fontSize: 32
};

export default function OverlayPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [particles, setParticles] = useState([]);

  const queueRef = useRef([]);
  const isShowingRef = useRef(false);
  const settingsRef = useRef(defaultSettings);

  // Sync settings ref
  useEffect(() => {
    settingsRef.current = settings;
    applyStyleProperties(settings);
  }, [settings]);

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
      const speakText = `${filteredDonor} บริจาค ${currentAlert.amount} บาท. ${currentAlert.message ? `ฝากข้อความว่า ${filteredMessage}` : ''}`;
      
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

    loadSettings();

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

  if (!currentAlert) return <div id="alertContainer" />;

  // Format header using template
  const amountFormatted = Number(currentAlert.amount).toLocaleString('th-TH', { minimumFractionDigits: 0 });
  const messageTemplate = settings.messageTemplate || '{donor} ได้บริจาค {amount} บาท! 🎉';
  
  const headerText = messageTemplate
    .replace(/{donor}/g, currentAlert.donor || 'Anonymous')
    .replace(/{amount}/g, amountFormatted);

  const filteredHeader = filterProfanity(headerText, settings);
  const filteredMessage = filterProfanity(currentAlert.message || '', settings);

  // Check if we should hide the small alert label
  const tempLower = messageTemplate.toLowerCase();
  const shouldHideLabel = tempLower.includes('{amount}') || tempLower.includes('บริจาค') || tempLower.includes('donate');
  const labelText = (settings.theme === 'cyberpunk' || settings.theme === 'minimal') ? 'PAY' : 'บริจาค';

  const alertBoxClasses = [
    'alert-box',
    `theme-${settings.theme}`,
    `anim-${settings.animation}`,
    isExiting ? 'exit' : ''
  ].filter(Boolean).join(' ');

  return (
    <div id="alertContainer">
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

      {/* Render flying particles */}
      {particles.map((p) => (
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
}
