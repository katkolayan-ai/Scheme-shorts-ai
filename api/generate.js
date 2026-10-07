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

    const pdfText =
      typeof body.text === "string"
        ? body.text.trim()
        : "";

    const language =
      body.language || "en";

    if (!pdfText) {
      return res.status(400).json({
        error: "No PDF text was received."
      });
    }

    const languageNames = {
      en: "English",
      hi: "Hindi",
      kok: "Konkani written in Devanagari script"
    };

    const targetLanguage =
      languageNames[language] ||
      languageNames.en;

    const text =
      pdfText.slice(0, 60000);

    const prompt = `
You are SchemeShorts AI.

Convert the following official government notification
into a clear, accurate 60-second public-information
explainer in ${targetLanguage}.

IMPORTANT ACCURACY RULES:

1. Use ONLY information contained in the notice.
2. Never invent benefits.
3. Never invent eligibility conditions.
4. Never invent money amounts.
5. Never invent deadlines.
6. Never invent documents.
7. Never invent websites, phone numbers or contacts.
8. Preserve official scheme names and numbers accurately.
9. If information is missing, say "Not specified in the notice."
10. Keep the language simple and natural for ordinary citizens.
11. Create a spoken script of approximately 100-150 words.
12. The script must fit a 60-second explainer.
13. Tell viewers to verify important information from the
    original official notification.
14. For Konkani, write naturally in Devanagari script.

Return ONLY valid JSON.

Required JSON:

{
  "schemeName": "...",
  "benefit": "...",
  "eligibility": "...",
  "deadline": "...",
  "script": "...",
  "note": "..."
}

Government notification:

${text}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
            temperature: 0.2,

            responseMimeType:
              "application/json",

            responseSchema: {
              type: "OBJECT",

              properties: {
                schemeName: {
                  type: "STRING"
                },

                benefit: {
                  type: "STRING"
                },

                eligibility: {
                  type: "STRING"
                },

                deadline: {
                  type: "STRING"
                },

                script: {
                  type: "STRING"
                },

                note: {
                  type: "STRING"
                }
              },

              required: [
                "schemeName",
                "benefit",
                "eligibility",
                "deadline",
                "script",
                "note"
              ]
            }
          }
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return res.status(502).json({
        error:
          "Gemini API error: " +
          (data?.error?.message ||
            "Request failed.")
      });
    }

    const generatedText =
      data?.candidates?.[0]
        ?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(502).json({
        error:
          "Gemini returned an empty response."
      });
    }

    let result;

    try {
      result =
        JSON.parse(generatedText);
    } catch (error) {
      console.error(
        "JSON parse error:",
        error
      );

      return res.status(502).json({
        error:
          "Gemini returned invalid JSON."
      });
    }

    return res.status(200).json({
      schemeName:
        result.schemeName ||
        "Not specified in the notice.",

      benefit:
        result.benefit ||
        "Not specified in the notice.",

      eligibility:
        result.eligibility ||
        "Not specified in the notice.",

      deadline:
        result.deadline ||
        "Not specified in the notice.",

      script:
        result.script ||
        "Not specified in the notice.",

      note:
        result.note ||
        "Please verify important information against the original official notification.",

      language
    });

  } catch (error) {

    console.error(
      "Generate server error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Unable to generate the explainer."
    });
  }
}