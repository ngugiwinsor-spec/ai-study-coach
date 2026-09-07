export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
  message,
  image,
  pdf,
  docxText,
  fileName
} = req.body || {};
    if (
      (!message || !message.trim()) &&
!image &&
!pdf &&
!docxtext
    ) {
      return res.status(400).json({
        error: "Message, image, PDF, or DOCX is required"
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is missing"
      });
    }

    let userContent;

    if (pdf) {

      userContent = [
        {
          type: "text",
          text:
            message?.trim() ||
            "Please analyze this PDF and explain its contents clearly for a student."
        },
        {
          type: "file",
          file: {
            filename: fileName || "document",
            file_data: pdf
          }
        }
      ];
          } else if (docxText) {

      userContent =
        (message?.trim() ||
        "Please analyze this Word document and explain its contents clearly for a student.") +
        "\n\nWORD DOCUMENT CONTENT:\n" +
        docxText;

    } else if (image) {

      userContent = [
        {
          type: "text",
          text:
            message?.trim() ||
            "Please analyze this image and explain what it contains clearly for a student."
        },
        {
          type: "image_url",
          image_url: {
            url: image
          }
        }
      ];

    } else {

      userContent = message.trim();

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
                "You are AI Study Coach. Help students understand academic topics clearly. When an image is provided, carefully analyze it and explain its academic content accurately. When a PDF is provided, read and analyze its contents carefully and explain them clearly for a student. Give accurate explanations, examples, quizzes, flashcards, and study plans when requested."
            },
            {
              role: "user",
              content: userContent
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed"
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({
        error: "No answer was returned by the AI"
      });
    }

    return res.status(200).json({
      answer
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to connect to the AI"
    });
  }
          }
