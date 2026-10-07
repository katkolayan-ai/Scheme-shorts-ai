export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // Get Gemini API key from Vercel environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Vercel."
    });
  }

  try {
    // Read request body
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const pdfText =
      typeof body.text === "string"
        ? body.text.trim()
        : "";

    if (!pdfText) {
      return res.status(400).json({
        error: "No PDF text was received."
      });
    }

    // Prevent extremely large requests
    const text = pdfText.slice(0, 60000);

    const prompt = `
You are SchemeShorts AI, an AI assistant that converts government scheme
notifications into simple 60-second public-information explainers.

Read the government notification below carefully.

IMPORTANT ACCURACY RULES:

1. Use ONLY information present in the notification.
2. Never invent facts.
3. Never invent eligibility conditions.
4. Never invent benefits or monetary amounts.
5. Never invent deadlines.
6. Never invent documents.
7. Never invent websites, phone numbers or contact information.
8. If information is not present, write:
   "Not specified in the notice."
9. Keep the language simple enough for an ordinary citizen.
10. The script should be approximately 100–150 words.
11. The script must be suitable for a 60-second video.
12. Clearly mention that viewers should verify important information
    from the original official notification.

Return ONLY valid JSON.

Required JSON structure:

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

    // Call Gemini API
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
            responseMimeType: "application/json",

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

    // Read Gemini response
    const data = await response.json();

    // Handle Gemini errors properly
    if (!response.ok) {
      console.error("Gemini API error:", data);

      const errorMessage =
        data?.error?.message ||
        data?.error?.status ||
        "Gemini API request failed.";

      return res.status(502).json({
        error: `Gemini API error: ${errorMessage}`
      });
    }

    // Get generated JSON text
    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    // Convert Gemini JSON into JavaScript object
    let result;

    try {
      result = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Gemini response:", generatedText);

      return res.status(502).json({
        error: "Gemini returned invalid JSON."
      });
    }

    // Send clean result back to website
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
        "Please verify important information against the original official notification."
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Unable to generate the explainer."
    });
  }
}