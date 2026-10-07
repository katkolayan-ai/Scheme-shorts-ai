export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language = body.language || 'en';
    const voice = body.voice || 'Kore';
    if (!text) return res.status(400).json({ error: 'No script was received.' });
    if (text.length > 12000) return res.status(400).json({ error: 'Script is too long for one TTS request.' });
    const languageNames = { en: 'English (India)', hi: 'Hindi (India)', kok: 'Konkani (India)' };
    const languageCodes = { en: 'en-IN', hi: 'hi-IN', kok: 'kok' };
    const languageName = languageNames[language] || languageNames.en;
    const languageCode = languageCodes[language] || languageCodes.en;
    const prompt = `Read this SchemeShorts public-information script naturally in ${languageName}. Speak clearly, warmly and confidently. Do not translate it and do not add words. Preserve all numbers, names and facts exactly. Use a moderate pace suitable for a 60-second explainer. Language code: ${languageCode}.\n\n${text}`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          responseFormat: { audio: { mimeType: 'AUDIO_L16', sampleRate: 24000 } },
          speechConfig: { voiceConfig: { voice }, languageCode }
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Gemini TTS request failed.';
      return res.status(502).json({ error: `Gemini TTS error: ${msg}` });
    }
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
    const pcm = part?.inlineData?.data;
    if (!pcm) return res.status(502).json({ error: 'Gemini returned no audio.' });
    return res.status(200).json({ audioBase64: pcm, mimeType: 'audio/L16;rate=24000', sampleRate: 24000, channels: 1, voice, language });
  } catch (error) {
    console.error('TTS server error:', error);
    return res.status(500).json({ error: error.message || 'Unable to generate voiceover.' });
  }
}
