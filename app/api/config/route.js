export async function GET(request) {
  // Return public configuration
  // The Google Client ID is public (it's visible in the browser anyway)
  // But we don't expose the OpenAI API key
  return Response.json({
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    allowedEmails: process.env.ALLOWED_EMAILS?.split(',').map(email => email.trim()) || []
  });
}
