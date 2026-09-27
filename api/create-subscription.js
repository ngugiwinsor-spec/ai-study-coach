export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      email,
      first_name,
      last_name,
      phone,
      plan,
      payment_method
    } = req.body || {};

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

    const amount = plan === "monthly" ? 19900 : 149900;

    /*
     * M-PESA PAYMENT
     */
    if (payment_method === "mpesa") {
      if (!phone) {
        return res.status(400).json({
          error: "M-PESA phone number is required."
        });
      }

      const formattedPhone = phone
        .replace(/\s+/g, "")
        .replace(/^0/, "+254");

      const response = await fetch(
        "https://api.paystack.co/charge",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            amount,
            currency: "KES",
            mobile_money: {
              phone: formattedPhone,
              provider: "mpesa"
            },
            metadata: {
              custom_fields: [
                {
                  display_name: "First Name",
                  variable_name: "first_name",
                  value: first_name
                },
                {
                  display_name: "Last Name",
                  variable_name: "last_name",
                  value: last_name
                },
                {
                  display_name: "Plan",
                  variable_name: "plan",
                  value: plan
                }
              ]
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error("Paystack M-PESA error:", data);

        return res.status(500).json({
  error: "Could not start M-PESA payment.",
  details: data.message || "Unknown Paystack error",
  paystack_response: data
});
      }

      console.log("M-PESA payment started:", {
        reference: data.data.reference,
        plan
      });

      return res.status(200).json({
        success: true,
        payment_method: "mpesa",
        reference: data.data.reference,
        status: data.data.status,
        display_text: data.data.display_text,
        plan
      });
    }

    /*
     * CARD PAYMENT
     */
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
          amount,
          currency: "KES",
          plan: planCodes[plan],
          channels: ["card"],
          callback_url:
            "https://ai-study-coach-eta.vercel.app/"
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

    console.log("Paystack card payment initialized:", {
      reference: data.data.reference,
      plan,
      plan_code: planCodes[plan]
    });

    return res.status(200).json({
      success: true,
      payment_method: "card",
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      plan
    });

  } catch (error) {
    console.error("Paystack payment error:", error);

    return res.status(500).json({
      error: "Something went wrong while creating the payment.",
      details: error.message
    });
  }
        }
