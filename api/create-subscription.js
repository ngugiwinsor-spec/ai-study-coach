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

    const planIds = {
      monthly: "R0V5607-month",
      yearly: "QY6D9K4-year"
    };

    if (!planIds[plan]) {
      return res.status(400).json({
        error: "Invalid plan selected."
      });
    }

    const secretKey = process.env.INTASEND_SECRET_KEY;

    if (!secretKey) {
      return res.status(500).json({
        error: "IntaSend secret key is not configured."
      });
    }

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };

    // 1. Create the IntaSend customer
    const customerResponse = await fetch(
      "https://api.intasend.com/api/v1/subscriptions-customers/",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          first_name,
          last_name,
          country: "KE"
        })
      }
    );

    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
      return res.status(customerResponse.status).json({
        error: "Could not create IntaSend customer.",
        details: customerData
      });
    }

    // 2. Create the subscription
    const subscriptionResponse = await fetch(
      "https://api.intasend.com/api/v1/subscriptions/",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: customerData.customer_id,
          plan_id: planIds[plan]
        })
      }
    );

    const subscriptionData = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      return res.status(subscriptionResponse.status).json({
        error: "Could not create IntaSend subscription.",
        details: subscriptionData
      });
    }

    // 3. Send the secure payment URL back to the app
    return res.status(200).json({
      success: true,
      setup_url: subscriptionData.setup_url,
      subscription_id: subscriptionData.subscription_id,
      customer_id: customerData.customer_id,
      plan: plan
    });

  } catch (error) {
    console.error("IntaSend subscription error:", error);

    return res.status(500).json({
      error: "Something went wrong while creating the subscription."
    });
  }
}
