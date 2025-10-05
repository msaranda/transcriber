# Transcription Service - Secure Deployment Guide

A private transcription service that converts audio and video files to text using OpenAI's Whisper AI, with Google authentication and secure API key handling.

## Features

✅ **Secure API Key Management** - OpenAI key never exposed to client  
✅ **Google OAuth Authentication** - Only whitelisted emails can access  
✅ **File Support** - Audio (MP3, WAV, etc.) and Video (MP4, MOV, etc.)  
✅ **Browser-side Conversion** - Videos converted to audio locally  
✅ **Whisper AI Integration** - High-quality transcription  
✅ **Download & Copy** - Easy export of transcriptions  

## Prerequisites

1. **Google Cloud Account** for OAuth
2. **OpenAI API Key** for Whisper
3. **Vercel Account** for deployment

## Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add to Authorized JavaScript origins:
   - `http://localhost:3000` (for local development)
   - `https://your-app-name.vercel.app` (for production)
7. Copy your Client ID

### 2. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (you won't be able to see it again!)

### 3. Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file (copy from `.env.example`):
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   OPENAI_API_KEY=sk-your-openai-api-key
   ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

### Method 1: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts and add environment variables when asked

### Method 2: Using GitHub

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `OPENAI_API_KEY` (⚠️ Keep this secret!)
   - `ALLOWED_EMAILS`
6. Click "Deploy"

### Method 3: Direct Upload

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Upload this folder
4. Add environment variables in the Vercel dashboard
5. Deploy

## Important: After Deployment

1. **Update Google OAuth**:
   - Go back to Google Cloud Console
   - Add your Vercel URL to Authorized JavaScript origins:
     - `https://your-app-name.vercel.app`

2. **Test the deployment**:
   - Try signing in with an authorized email
   - Upload a test file
   - Verify transcription works

## Environment Variables in Vercel

In your Vercel project settings, go to "Settings" > "Environment Variables" and add:

| Variable | Value | Type |
|----------|--------|------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google Client ID | Plain text |
| `OPENAI_API_KEY` | Your OpenAI API key | **Sensitive** (check the box) |
| `ALLOWED_EMAILS` | Comma-separated emails | Plain text |

## Security Features

1. **API Key Protection**: OpenAI key only exists on server, never sent to browser
2. **Email Whitelist**: Only specified emails can access
3. **Server-side Validation**: All API calls validated on backend
4. **HTTPS Only**: Vercel provides automatic SSL

## Troubleshooting

### "Access Denied" after Google sign-in
- Check that your email is in the `ALLOWED_EMAILS` environment variable
- Verify the variable is properly set in Vercel

### Google Sign-in not working
- Ensure your domain is added to Google OAuth authorized origins
- Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correct

### Transcription fails
- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Ensure the `OPENAI_API_KEY` env variable is set in Vercel

### File upload issues
- Maximum file size depends on your Vercel plan (4.5MB on hobby plan)
- For larger files, consider upgrading your Vercel plan

## Usage

1. Share the Vercel URL with your authorized friends
2. They sign in with their whitelisted Google account
3. Upload audio/video file
4. Get transcription
5. Copy or download the result

## Cost Considerations

- **OpenAI**: ~$0.006 per minute of audio
- **Vercel**: Free tier includes 100GB bandwidth/month
- **Google OAuth**: Free

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure Google OAuth is properly configured
4. Check Vercel function logs for server-side errors

---

**Note**: Never commit your `.env.local` file or expose your API keys. Always use environment variables in production!
