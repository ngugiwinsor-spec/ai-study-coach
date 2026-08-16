export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
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
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI study coach. Explain academic topics clearly, help students understand concepts, create study strategies, and encourage learning rather than simply giving answers."
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

    return res.status(200).json({
      answer:
        data?.choices?.[0]?.message?.content ||
        "No response received from the AI."
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unexpected server error."
    });
  }
  }
