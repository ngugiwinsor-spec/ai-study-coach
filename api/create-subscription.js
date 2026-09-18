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
  monthly: "R0V5607",
  yearly: "QY6D9K4"
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

    // 1. Create IntaSend customer
    const customerResponse = await fetch(
    "https://payment.intasend.com/api/v1/subscriptions-customers/",
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

    const customerText = await customerResponse.text();

    let customerData;

    try {
      customerData = JSON.parse(customerText);
    } catch {
      customerData = { raw_response: customerText };
    }

    if (!customerResponse.ok) {
      console.error(
  "IntaSend customer error:",
  JSON.stringify({
    status: customerResponse.status,
    response: customerData
  }, null, 2)
);

      return res.status(500).json({
        error: "Could not create IntaSend customer.",
        intasend_status: customerResponse.status,
        details: customerData
      });
    }

    // 2. Create subscription
    const subscriptionResponse = await fetch(
    "https://payment.intasend.com/api/v1/subscriptions/",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
  customer_id: customerData.customer_id,
  plan_id: planIds[plan],
  reference: `AI-STUDY-${Date.now()}`,
  redirect_url: "https://ai-study-coach-eta.vercel.app/"
})
      }
    );

    const subscriptionText = await subscriptionResponse.text();

    let subscriptionData;

    try {
      subscriptionData = JSON.parse(subscriptionText);
    } catch {
      subscriptionData = { raw_response: subscriptionText };
    }

    if (!subscriptionResponse.ok) {
      console.error("IntaSend subscription error:", {
        status: subscriptionResponse.status,
        response: subscriptionData
      });

      return res.status(500).json({
        error: "Could not create IntaSend subscription.",
        intasend_status: subscriptionResponse.status,
        details: subscriptionData
      });
    }

    // 3. Return secure IntaSend payment/setup URL
    console.log("IntaSend subscription response:", {
  subscription_id: subscriptionData.subscription_id,
  setup_url_host: subscriptionData.setup_url
    ? new URL(subscriptionData.setup_url).host
    : null,
  redirect_url_host: subscriptionData.redirect_url
    ? new URL(subscriptionData.redirect_url).host
    : null,
  setup_url_exists: !!subscriptionData.setup_url,
  redirect_url_exists: !!subscriptionData.redirect_url,
  status: subscriptionData.status,
  keys: Object.keys(subscriptionData)
});
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
      error: "Something went wrong while creating the subscription.",
      details: error.message
    });
  }
        }
