import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      reference,
      user_id,
      plan
    } = req.body || {};

    if (!reference || !user_id || !plan) {
      return res.status(400).json({
        error: "Reference, user ID and plan are required."
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !secretKey ||
      !supabaseUrl ||
      !supabaseServiceKey
    ) {
      return res.status(500).json({
        error: "Server environment variables are not configured."
      });
    }

    // Verify the payment directly with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/charge/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const paystackData = await paystackResponse.json();

    console.log("Premium activation verification:", {
      status: paystackData.data?.status,
      reference: paystackData.data?.reference,
      amount: paystackData.data?.amount,
      currency: paystackData.data?.currency
    });

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      paystackData.data?.status !== "success"
    ) {
      return res.status(400).json({
        error: "Payment has not been successfully confirmed.",
        status: paystackData.data?.status || "unknown"
      });
    }

    // Make sure the payment amount matches the selected plan
    const expectedAmount =
      plan === "monthly" ? 19900 : 149900;

    if (paystackData.data.amount !== expectedAmount) {
      return res.status(400).json({
        error: "Payment amount does not match the selected plan."
      });
    }

    if (paystackData.data.currency !== "KES") {
      return res.status(400).json({
        error: "Payment currency is incorrect."
      });
    }

    // Connect to Supabase using the SERVER-ONLY service key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const days =
      plan === "monthly" ? 30 : 365;

    const premiumUntil = new Date();

    premiumUntil.setDate(
      premiumUntil.getDate() + days
    );

    const { error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription: "premium",
          premium_until: premiumUntil.toISOString()
        })
        .eq("id", user_id);

    if (updateError) {
      console.error(
        "Supabase Premium update error:",
        updateError
      );

      return res.status(500).json({
        error: "Payment was confirmed but Premium could not be activated.",
        details: updateError.message
      });
    }

    console.log("Premium activated:", {
      user_id,
      plan,
      premium_until: premiumUntil.toISOString(),
      reference
    });

    return res.status(200).json({
      success: true,
      message: "Premium activated successfully.",
      plan,
      premium_until: premiumUntil.toISOString()
    });

  } catch (error) {
    console.error(
      "Premium activation error:",
      error
    );

    return res.status(500).json({
      error: "Something went wrong while activating Premium.",
      details: error.message
    });
  }
}
