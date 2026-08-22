import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, code } = req.body || {};

    if (!accessToken || !code) {
      return res.status(400).json({
        error: "Access token and voucher code are required."
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({
        error: "You must be logged in."
      });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", normalizedCode)
      .eq("active", true)
      .maybeSingle();

    if (voucherError) {
      return res.status(500).json({
        error: "Could not check voucher."
      });
    }

    if (!voucher) {
      return res.status(400).json({
        error: "Invalid or inactive voucher."
      });
    }

    if (
      voucher.expires_at &&
      new Date(voucher.expires_at).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        error: "This voucher has expired."
      });
    }

    if (voucher.uses >= voucher.max_uses) {
      return res.status(400).json({
        error: "This voucher has reached its usage limit."
      });
    }

    const { data: existingRedemption } = await supabase
      .from("voucher_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("voucher_id", voucher.id)
      .maybeSingle();

    if (existingRedemption) {
      return res.status(400).json({
        error: "You have already used this voucher."
      });
    }

    const now = new Date();
    const premiumUntil = new Date(
      now.getTime() + Number(voucher.duration_days) * 24 * 60 * 60 * 1000
    );

    const { error: redemptionError } = await supabase
      .from("voucher_redemptions")
      .insert({
        user_id: user.id,
        voucher_id: voucher.id
      });

    if (redemptionError) {
      return res.status(500).json({
        error: "Could not record voucher redemption."
      });
    }

    const { error: usageError } = await supabase
      .from("vouchers")
      .update({ uses: voucher.uses + 1 })
      .eq("id", voucher.id);

    if (usageError) {
      return res.status(500).json({
        error: "Could not update voucher usage."
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription: "premium",
        premium_until: premiumUntil.toISOString()
      })
      .eq("id", user.id);

    if (profileError) {
      return res.status(500).json({
        error: "Could not update your Premium status."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Voucher redeemed successfully.",
      premium_until: premiumUntil.toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error."
    });
  }
}
