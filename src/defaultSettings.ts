const defaultSettings = {
  orientation: 'landscape', // landscape, portrait
  duration: 8, // seconds
  soundEnabled: true,
  soundChoice: 'chime', // chime, retro, modern, bell, none
  soundVolume: 0.5,
  ttsEnabled: false,
  ttsVolume: 0.8,
  ttsRate: 1.0,
  ttsLanguage: 'th-TH',
  ttsVoice: 'default',
  profanityFilterEnabled: true,
  profanityWords: 'ควย, เย็ด, สัส, เหี้ย, หี, แตด, ล่อ, ดอกทอง, ส้นตีน, อีดอก, อีเหี้ย, พ่อง, แม่มึง, กู, มึง',
  profanityReplaceStyle: 'asterisks', // asterisks, polite, block
  messageTemplate: '{donor} ได้ส่งหัวใจ {amount} ดวง! 🎉',
  showDonorMessage: true,
  minAmount: 1, // Minimum amount to trigger alert
  theme: 'glassmorphism', // glassmorphism, cyberpunk, minimal, custom
  animation: 'slide-down', // slide-down, slide-up, fade, zoom
  fontFamily: 'Noto Sans Thai',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#ffffff',
  borderColor: 'rgba(255, 255, 255, 0.25)',
  particleCount: 15,
  fontSize: 32,
  widgets: [
    {
      id: 'donation-alert',
      name: 'Donation Alert (กล่องเตือนส่งกำลังใจ)',
      x: 710,
      y: 50,
      width: 500,
      height: 150,
      scale: 1.0,
      enabled: true,
      settings: {}
    },
    {
      id: 'donation-goal',
      name: 'Donation Goal Bar (เป้าหมายส่งกำลังใจ)',
      x: 50,
      y: 950,
      width: 600,
      height: 80,
      scale: 1.0,
      enabled: false,
      settings: {
        title: 'เป้าหมายสตรีมมิ่ง 🎯',
        target: 5000,
        current: 0,
        color: '#10b981',
        autoCalculate: true
      }
    },
    {
      id: 'recent-donors',
      name: 'Recent Donors (ผู้ส่งกำลังใจล่าสุด)',
      x: 1470,
      y: 50,
      width: 400,
      height: 350,
      scale: 1.0,
      enabled: false,
      settings: {
        title: 'ผู้สนับสนุนล่าสุด 💖',
        limit: 5,
        showAmount: true
      }
    },
    {
      id: 'custom-banner',
      name: 'Custom Overlay (ข้อความแนะนำตัว)',
      x: 50,
      y: 50,
      width: 450,
      height: 120,
      scale: 1.0,
      enabled: false,
      settings: {
        html: '<div style="color: #00f3ff; font-weight: bold; font-size: 20px; text-shadow: 0 0 5px #00f3ff;">ยินดีต้อนรับสู่สตรีม! 🚀</div><div style="color: #fff; font-size: 14px; margin-top: 4px;">อย่าลืมกดติดตามและสนับสนุนผ่านช่องทาง QR Code ได้เลยครับ</div>'
      }
    },
    {
      id: 'qr-code',
      name: 'QR Code Link (กล่องสแกนคิวอาร์โค้ด)',
      x: 50,
      y: 720,
      width: 200,
      height: 250,
      scale: 1.0,
      enabled: false,
      settings: {
        title: 'ส่งกำลังใจที่นี่ 💝',
        qrColor: '#667eea',
        showLabel: true
      }
    }
  ]
};

export default defaultSettings;
