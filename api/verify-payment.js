export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({
      error: "Payment reference is required."
    });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({
      error: "Paystack secret key is not configured."
    });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/charge/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    console.log("Paystack charge verification:", data);

    if (!response.ok || !data.status) {
      return res.status(500).json({
        error: "Could not verify M-PESA payment.",
        details: data.message || "Unknown Paystack error"
      });
    }

    return res.status(200).json({
      success: true,
      status: data.data.status,
      reference: data.data.reference,
      amount: data.data.amount,
      currency: data.data.currency,
      channel: data.data.channel,
      gateway_response: data.data.gateway_response,
      display_text: data.data.display_text
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      error: "Something went wrong while verifying payment.",
      details: error.message
    });
  }
}
