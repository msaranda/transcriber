import './globals.css'

export const metadata = {
  title: 'Transcription Service - Convert Audio & Video to Text',
  description: 'Private transcription service powered by Whisper AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
