import './globals.css';
import SessionProviderWrapper from './components/SessionProviderWrapper';

export const metadata = {
  title: '💝 สนับสนุนและส่งกำลังใจ (Stream Donation)',
  description: 'ร่วมสนับสนุนและส่งกำลังใจให้พวกเราพัฒนาผลงานต่อไป ✨',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
