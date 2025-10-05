export async function POST(request) {
  try {
    // Get the form data
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      return Response.json(
        { message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (Vercel has a 4.5MB limit on hobby plan)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    if (audioFile.size > maxSize) {
      return Response.json(
        { message: `File too large. Maximum size is 4.5MB, your file is ${(audioFile.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 413 }
      );
    }

    console.log(`Processing file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Prepare the form data for OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioFile);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('response_format', 'text');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return Response.json(
        { message: `Transcription failed: ${errorText}` },
        { status: response.status }
      );
    }

    const transcription = await response.text();
    
    return Response.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json(
      { message: `An error occurred during transcription: ${error.message}` },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we need the raw body for file upload
  },
};
