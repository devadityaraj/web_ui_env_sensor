import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
export const metadata: Metadata = { title: 'Galgotias Drone and Robotics Lab | Environmental Monitor', description: 'Live environmental intelligence from the Galgotias Drone and Robotics Lab.', generator: 'v0.app' }
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#06111f', userScalable: false }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className="bg-background"><body className={`${geist.variable} antialiased`}>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html> }
