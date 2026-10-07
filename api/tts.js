
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Vercel."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const text =
      typeof body.text === "string"
        ? body.text.trim()
        : "";

    const language =
      body.language || "en";

    const voice =
      body.voice || "Kore";

    if (!text) {
      return res.status(400).json({
        error: "No script was received."
      });
    }

    if (text.length > 12000) {
      return res.status(400).json({
        error: "Script is too long for one TTS request."
      });
    }

    const languageInstructions = {
      en: `
Speak in clear Indian English.
Use a warm, natural and confident public-information style.
Do not translate the script.
`,

      hi: `
Speak in natural Hindi.
Use clear, simple Hindi suitable for ordinary citizens in India.
Do not translate the script.
`,

      kok: `
Speak the Konkani script exactly as provided.
The text may be written in Devanagari Konkani.
Do NOT translate it into Hindi or Marathi.
Pronounce it naturally as Konkani.
Use a warm, natural Goan conversational style.
`
    };

    const instruction =
      languageInstructions[language] ||
      languageInstructions.en;

    const prompt = `
You are the official voice of SchemeShorts AI.

${instruction}

VOICE STYLE:
- Natural human-like delivery
- Warm and friendly
- Clear pronunciation
- Moderate speaking speed
- Suitable for a 60-second government-scheme explainer
- Slight emphasis on important numbers, benefits and deadlines
- Do not add any words
- Do not remove any words
- Do not change names, numbers, dates or facts

SCRIPT:

${text}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            responseModalities: ["AUDIO"],

            speechConfig: {
              voiceConfig: {
                voice: voice
              }
            }
          }
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Gemini TTS error:",
        data
      );

      return res.status(502).json({
        error:
          "Gemini TTS error: " +
          (data?.error?.message ||
            "Voice generation failed.")
      });
    }

    const audioPart =
      data?.candidates?.[0]
        ?.content?.parts
        ?.find(
          part =>
            part?.inlineData?.data
        );

    const audioBase64 =
      audioPart?.inlineData?.data;

    if (!audioBase64) {
      console.error(
        "Gemini TTS response:",
        data
      );

      return res.status(502).json({
        error:
          "Gemini returned no audio."
      });
    }

    return res.status(200).json({
      audioBase64,
      mimeType: "audio/wav",
      sampleRate: 24000,
      channels: 1,
      voice,
      language
    });

  } catch (error) {

    console.error(
      "TTS server error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Unable to generate voiceover."
    });
  }
}