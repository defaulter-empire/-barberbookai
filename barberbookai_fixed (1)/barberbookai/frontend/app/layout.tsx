import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BarberBookAI — WhatsApp Appointment Booking',
  description: 'AI-powered WhatsApp appointment booking for barbershops',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#17171f', color: '#f1f5f9', border: '1px solid #2a2a38' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#f1f5f9' } }
          }}
        />
      </body>
    </html>
  );
}
