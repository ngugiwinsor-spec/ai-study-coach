export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured in Vercel."
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-study-coach-eta.vercel.app",
          "X-Title": "AI Study Coach"
        },

        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free",

          messages: [
            {
              role: "system",
              content:
                "You are AI Study Coach, a helpful and encouraging study assistant. Explain academic concepts clearly and step by step. Help students understand difficult topics, create study strategies, generate examples, and improve their learning. Do not simply give answers when explaining academic work; teach the student how to understand the topic."
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.error ||
          "OpenRouter request failed."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({
      answer: answer
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        "Unexpected server error while contacting the AI."
    });
  }
              }
