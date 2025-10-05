'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, FileAudio, LogOut, Shield, Mic, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [allowedEmails, setAllowedEmails] = useState([]);
  const fileInputRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Fetch configuration from API
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setAllowedEmails(data.allowedEmails);
        
        // Create the Google response handler with the loaded emails
        const handleGoogleResponseWithEmails = (response) => {
          // Decode JWT token to get user info
          const userObject = JSON.parse(atob(response.credential.split('.')[1]));
          
          if (data.allowedEmails.includes(userObject.email)) {
            setUser(userObject);
            setIsAuthorized(true);
            setError('');
          } else {
            setError('Access denied. Your email is not authorized to use this service.');
            setIsAuthorized(false);
          }
        };
        
        // Load Google Sign-In with the client ID from server
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          window.google.accounts.id.initialize({
            client_id: data.googleClientId,
            callback: handleGoogleResponseWithEmails,
            auto_select: false,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              width: 300,
              text: 'continue_with',
              shape: 'rectangular'
            }
          );
          setGoogleLoaded(true);
        };
        document.body.appendChild(script);
      })
      .catch(err => {
        setError('Failed to load configuration. Please refresh the page.');
        console.error(err);
      });
  }, []);


  const handleLogout = () => {
    setUser(null);
    setIsAuthorized(false);
    setFile(null);
    setTranscription('');
    setError('');
    setProgress('');
    
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const validTypes = ['audio/', 'video/'];
      
      // Check file size (allow larger files since we can compress them)
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes (reasonable limit)
      if (selectedFile.size > maxSize) {
        setError(`File too large. Maximum size is 25MB, your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        setFile(null);
        return;
      }
      
      if (validTypes.some(type => fileType.startsWith(type))) {
        setFile(selectedFile);
        setError('');
        setTranscription('');
      } else {
        setError('Please select a valid audio or video file');
        setFile(null);
      }
    }
  };

  const convertToAudio = async (file) => {
    setProgress('Converting to audio format...');
    
    // For video files, send directly to the server - Whisper can handle video files
    if (file.type.startsWith('video/')) {
      setProgress('Video file detected - sending directly to Whisper AI...');
      return file; // Return the original file, Whisper can handle video
    }
    
    // For audio files, try to convert to WAV if needed
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV
          const length = audioBuffer.length;
          const numberOfChannels = audioBuffer.numberOfChannels;
          const sampleRate = audioBuffer.sampleRate;
          
          const wavBuffer = audioContext.createBuffer(
            numberOfChannels,
            length,
            sampleRate
          );
          
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            wavBuffer.copyToChannel(channelData, channel);
          }
          
          // Create WAV file
          const wavBlob = await audioBufferToWav(wavBuffer);
          resolve(wavBlob);
        } catch (err) {
          // If direct decoding fails, send the original file
          console.warn('Direct audio decoding failed, sending original file:', err);
          resolve(file);
        }
      };
      
      reader.onerror = () => {
        // If reading fails, send the original file
        resolve(file);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const audioBufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;
    
    // Write WAV header
    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    
    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };
    
    // RIFF identifier
    setUint32(0x46464952);
    // file length minus RIFF identifier length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate (sample rate * block align)
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    // block align (channel count * bytes per sample)
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);
    
    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const transcribeAudio = async (audioBlob) => {
    setProgress('Sending to Whisper AI for transcription...');
    
    // Check if file is too large and needs chunked upload
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB
    if (audioBlob.size > maxSize) {
      return await transcribeLargeFile(audioBlob);
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Try to get error message, but handle non-JSON responses
        let errorMessage = `Transcription failed: ${response.status}`;
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (jsonErr) {
          // If response is not JSON, get the text
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          errorMessage = `Server error: ${response.status} - ${errorText.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      return data.transcription;
    } catch (err) {
      throw new Error(`Transcription error: ${err.message}`);
    }
  };

  const transcribeLargeFile = async (audioBlob) => {
    setProgress('Large file detected - compressing for upload...');
    
    // For large files, we'll compress them first
    try {
      // Create a compressed version using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Try to decode and re-encode with lower quality
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Reduce sample rate to 16kHz (good for speech)
      const targetSampleRate = 16000;
      const length = Math.floor(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
      const compressedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        length,
        targetSampleRate
      );
      
      // Copy and resample audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const inputData = audioBuffer.getChannelData(channel);
        const outputData = compressedBuffer.getChannelData(channel);
        
        for (let i = 0; i < length; i++) {
          const inputIndex = Math.floor(i * audioBuffer.sampleRate / targetSampleRate);
          outputData[i] = inputData[inputIndex];
        }
      }
      
      // Convert to WAV with lower quality
      const compressedWav = await audioBufferToWav(compressedBuffer);
      
      // Check if compression helped
      if (compressedWav.size > maxSize) {
        throw new Error(`File is too large even after compression (${(compressedWav.size / 1024 / 1024).toFixed(2)}MB). Please use a shorter audio file or upgrade to Vercel Pro plan.`);
      }
      
      setProgress('Uploading compressed file...');
      return await transcribeAudio(compressedWav);
      
    } catch (err) {
      throw new Error(`Large file processing failed: ${err.message}`);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError('');
    setProgress('Starting transcription process...');
    
    try {
      // Convert to audio if needed
      let audioBlob = file;
      if (file.type.startsWith('video/')) {
        audioBlob = await convertToAudio(file);
      } else if (!file.type.includes('wav')) {
        // Convert non-WAV audio to WAV
        audioBlob = await convertToAudio(file);
      }
      
      // Transcribe
      const text = await transcribeAudio(audioBlob);
      setTranscription(text);
      setProgress('');
    } catch (err) {
      setError(`Error: ${err.message}`);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyTranscription = () => {
    navigator.clipboard.writeText(transcription);
    setProgress('Copied to clipboard!');
    setTimeout(() => setProgress(''), 2000);
  };

  const handleDownloadTranscription = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Login Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Mic className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Transcription Service</h1>
            <p className="text-gray-600">Convert your audio and video files to text using AI</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-4">
              <Shield className="w-4 h-4" />
              <span>Secure access for authorized users only</span>
            </div>
            
            <div id="google-signin-button" className="flex justify-center"></div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By signing in, you confirm you have permission to use this service
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main App Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                <Mic className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Transcription Service</h1>
                <p className="text-sm text-gray-500">Powered by Whisper AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!transcription ? (
          // Upload Screen
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Your File</h2>
              <p className="text-gray-600">Select an audio or video file to transcribe</p>
            </div>

            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Click to select a file
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports MP3, WAV, MP4, MOV, and more
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {progress && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    <p className="text-sm text-blue-700">{progress}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleTranscribe}
                disabled={!file || isProcessing}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
                  file && !isProcessing
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  'Start Transcription'
                )}
              </button>
            </div>
          </div>
        ) : (
          // Transcription Result Screen
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Transcription Complete</h2>
                <p className="text-gray-600 mt-1">{file?.name}</p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setTranscription('');
                  setError('');
                }}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                New File
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                  {transcription}
                </pre>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCopyTranscription}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={handleDownloadTranscription}
                  className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Download as Text
                </button>
              </div>

              {progress && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 text-center">{progress}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Private transcription service • Your files are processed securely</p>
      </footer>
    </div>
  );
}
