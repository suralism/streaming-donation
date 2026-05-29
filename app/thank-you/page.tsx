import Link from 'next/link';

export const metadata = {
  title: 'ขอบคุณสำหรับการสนับสนุน! 💝',
  description: 'ขอบคุณสำหรับการสนับสนุนที่อบอุ่นของคุณ ทุกบาททุกสตางค์มีความหมายกับพวกเราเป็นอย่างยิ่ง ✨',
};

export default function ThankYouPage() {
  return (
    <>
      {/* Glowing Background Blur Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="container">
        <div className="card glass-card thank-you">
          <div className="icon glowing-heart">💝</div>
          <h1>ขอบคุณมากค่ะ!</h1>
          <p className="subtitle">
            สำหรับการสนับสนุนที่อบอุ่นของคุณ<br />
            ทุกบาททุกสตางค์มีความหมายในการเดินทางของพวกเราอย่างยิ่ง ✨
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </>
  );
}
