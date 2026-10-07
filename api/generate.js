export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured"
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

    if (!pdfText) {
      return res.status(400).json({
        error: "No PDF text was received"
      });
    }

    const text = pdfText.slice(0, 60000);

    const prompt = `
You are SchemeShorts AI.

Read the government scheme notification below and create a simple,
accurate 60-second public-information explainer.

IMPORTANT RULES:
- Use ONLY information contained in the notification.
- Never invent facts.
- Never invent eligibility conditions.
- Never invent benefits or amounts.
- Never invent deadlines.
- Never invent documents, websites, phone numbers or contact details.
- If something is not mentioned, write "Not specified in the notice".
- Keep the language simple and suitable for ordinary citizens.
- The script should be approximately 100 to 150 words.
- Tell viewers to verify important information with the original official notification.

Return ONLY valid JSON with these six fields:

schemeName
benefit
eligibility
deadline
script
note

Government notification:

${text}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
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

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(502).json({
        error: "Gemini API request failed"
      });
    }

    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    const result = JSON.parse(generatedText);

    return res.status(200).json({
      schemeName: result.schemeName || "Not specified in the notice",
      benefit: result.benefit || "Not specified in the notice",
      eligibility: result.eligibility || "Not specified in the notice",
      deadline: result.deadline || "Not specified in the notice",
      script: result.script || "",
      note:
        result.note ||
        "Verify important information against the original official notification."
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Unable to generate the explainer"
    });
  }
}
