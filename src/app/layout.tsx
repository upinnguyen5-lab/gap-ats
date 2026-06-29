import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GAP ATS — Hệ thống Tuyển dụng',
  description: 'Hệ thống quản lý tuyển dụng GAP Global — Applicant Tracking System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">{children}</body>
    </html>
  )
}
