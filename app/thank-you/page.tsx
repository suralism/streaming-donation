import Link from 'next/link';

export const metadata = {
  title: 'ขอบคุณสำหรับการสนับสนุน! ✨',
  description: 'ขอบคุณสำหรับการส่งหัวใจสนับสนุน หัวใจของคุณจะถูกส่งมอบให้ครีเอเตอร์ที่คุณเลือกทันที ✨',
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
          <div className="icon glowing-heart" style={{ display: 'flex', justifyContent: 'center' }}><span className="heart-icon heart-lg" /></div>
          <h1>ขอบคุณมากค่ะ!</h1>
          <p className="subtitle">
            หัวใจของคุณได้ถูกส่งมอบไปยังครีเอเตอร์เรียบร้อยแล้ว<br />
            ทุกดวงหัวใจมีความหมายในการเดินทางของพวกเราอย่างยิ่ง ✨
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </>
  );
}
