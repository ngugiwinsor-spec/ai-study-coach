export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, first_name, last_name, plan } = req.body || {};

    if (!email || !first_name || !last_name || !plan) {
      return res.status(400).json({
        error: "Email, first name, last name and plan are required."
      });
    }

    const planCodes = {
      monthly: "PLN_7i9lg806r2o48rt",
      yearly: "PLN_cz22w661j6blb88"
    };

    if (!planCodes[plan]) {
      return res.status(400).json({
        error: "Invalid plan selected."
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return res.status(500).json({
        error: "Paystack secret key is not configured."
      });
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: plan === "monthly" ? 19900 : 149900,
          currency: "KES",
          plan: planCodes[plan],
          callback_url: "https://ai-study-coach-eta.vercel.app/"
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error("Paystack initialization error:", data);

      return res.status(500).json({
        error: "Could not initialize Paystack payment.",
        details: data.message || "Unknown Paystack error"
      });
    }

    console.log("Paystack payment initialized:", {
      reference: data.data.reference,
      plan,
      plan_code: planCodes[plan]
    });

    return res.status(200).json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      plan
    });

  } catch (error) {
    console.error("Paystack subscription error:", error);

    return res.status(500).json({
      error: "Something went wrong while creating the subscription.",
      details: error.message
    });
  }
      }
