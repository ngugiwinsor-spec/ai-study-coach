export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};
    const message = body.message;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured in Vercel."
      });
    }

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-study-coach-eta.vercel.app",
          "X-Title": "AI Study Coach"
        },

        body: JSON.stringify({
          model: "openrouter/free",

          messages: [
            {
              role: "system",
              content:
                "You are AI Study Coach. You help students learn academic subjects clearly. Explain concepts simply, provide examples, create quizzes, flashcards and study plans when requested. Be accurate, encouraging and educational."
            },
            {
              role: "user",
              content: message.trim()
            }
          ],

          temperature: 0.7
        })
      }
    );

    const data = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      return res.status(500).json({
        error:
          data?.error?.message ||
          "OpenRouter returned an error."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({
        error: "The AI returned no answer."
      });
    }

    return res.status(200).json({
      answer: answer
    });

  } catch (error) {
    console.error("AI API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to connect to the AI."
    });
  }
      }
