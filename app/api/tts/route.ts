import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'th';

    if (!text) {
      return new Response('Text is required', { status: 400 });
    }

    // Fix Google Translate TTS spelling bug and apply phonetic testing
    let processedText = text;
    if (lang === 'th' || lang.startsWith('th')) {
      processedText = processedText
        .replace(/ดวง/g, 'ห้อง')
        .replace(/ส่งหัวใจ/g, 'ส่งหัวใจ');
    }

    const encodedText = encodeURIComponent(processedText);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;

    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Google TTS responded with status ${response.status}`);
      return new Response('Error generating TTS from cloud', { status: response.status });
    }

    // Stream the audio binary stream directly to client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
