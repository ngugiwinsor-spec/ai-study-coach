const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, duration_days, max_uses } = req.body || {};

    if (!accessToken) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const duration = Number(duration_days);
    const uses = Number(max_uses);

    if (!Number.isInteger(duration) || duration < 1) {
      return res.status(400).json({ error: "Invalid duration." });
    }

    if (!Number.isInteger(uses) || uses < 1) {
      return res.status(400).json({ error: "Invalid number of uses." });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    if (
      !adminEmail ||
      userData.user.email.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      return res.status(403).json({ error: "Admin access required." });
    }

    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "AI";

    for (let i = 0; i < 8; i++) {
      code += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .insert({
        code,
        duration_days: duration,
        max_uses: uses,
        uses: 0,
        active: true
      })
      .select()
      .single();

    if (voucherError) {
      console.error("Voucher creation error:", voucherError);
      return res.status(500).json({
        error: "Could not create voucher."
      });
    }

    return res.status(200).json({
      success: true,
      voucher: {
        code: voucher.code,
        duration_days: voucher.duration_days,
        max_uses: voucher.max_uses
      }
    });
  } catch (error) {
    console.error("Create voucher error:", error);

    return res.status(500).json({
      error: "Something went wrong."
    });
  }
};
