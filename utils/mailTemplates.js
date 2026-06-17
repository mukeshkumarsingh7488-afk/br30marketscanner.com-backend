const otpTemplate = (name, otp) => {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>

      <body style="margin:0;padding:0;background:transparent;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:transparent;padding:0">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background: #0a0a0a; border-radius: 24px; overflow: hidden; border: 2px solid #00ff88">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/dw4imlekm/image/upload/v1779141465/Green_burner_qc5lon.jpg" width="100%" style="display: block" />
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 35px; text-align: center">
                <h1 style="margin: 0; color: #00ff88; font-size: 32px; font-weight: 900">BR30 Market Scanner</h1>

                <p style="margin: 30px 0 10px; color: #ffffff; font-size: 18px">Hello <strong>${name}</strong>,</p>

                <p style="margin: 0; color: #cbd5e1; font-size: 16px; line-height: 28px">
                  Thank you for registering with BR30 Market Scanner.
                  <br />
                  Please use the OTP below to verify your account.
                </p>

                <div style="margin: 35px auto 25px auto; width: 280px; background: #000; border: 2px solid #00ff88; border-radius: 18px; padding: 25px 10px; box-shadow: 0 0 20px rgba(0, 255, 136, 0.2)">
                  <div style="font-size: 42px; font-weight: 900; color: #00ff88; letter-spacing: 10px">${otp}</div>
                </div>

                <p style="margin: 0; color: #ffffff; font-size: 15px">⏳ Valid for 10 minutes</p>

                <p style="margin-top: 20px; color: #94a3b8; font-size: 14px; line-height: 24px">Do not share this OTP with anyone.</p>
              </td>
            </tr>

            <tr>
              <td style="padding: 25px 30px; background: #050505; border-top: 1px solid #111; text-align: center">
                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 700">Regards,</p>

                <p style="margin: 8px 0 20px; color: #00ff88; font-size: 18px; font-weight: 900">BR30 Support Team</p>

                <table align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 6px">
                      <a href="https://www.youtube.com/@br30traderofficial">
                        <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="24" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.instagram.com/br30Traderofficial">
                        <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.facebook.com/share/1DDJYGYYDf/">
                        <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="24" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://t.me/+hBAT4kWo63A4ZWY1">
                        <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="24" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://chat.whatsapp.com/B4t82SWBcgOIZTeQXp1wDI">
                        <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="24" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://x.com/MukeshKuma48159">
                        <img src="https://cdn.simpleicons.org/x/ffffff" width="24" height="24" style="display: block; background: #000; border-radius: 50%; padding: 3px" />
                      </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.threads.com/@br30traderofficial" style="color: #fff; text-decoration: none; font-size: 22px; font-weight: bold"> @ </a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.linkedin.com/in/mukesh-raj-b75a65253">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" />
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin-top: 18px; color: #666; font-size: 11px">© BR30 Market Scanner. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

const forgotPasswordTemplate = (name, otp) => `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>

      <body style="margin:0;padding:0;background:transparent;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:transparent;padding:0">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:24px;overflow:hidden;border:2px solid #00ff88">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/dw4imlekm/image/upload/v1779141465/Green_burner_qc5lon.jpg" width="100%" style="display:block" />
              </td>
            </tr>

            <tr>
              <td style="padding:40px 35px;text-align:center">
                <h1 style="margin:0;color:#00ff88;font-size:32px;font-weight:900">BR30 Market Scanner</h1>

                <p style="margin:30px 0 10px;color:#ffffff;font-size:18px">Hello <strong>${name}</strong>,</p>

                <p style="margin:0;color:#cbd5e1;font-size:16px;line-height:28px">
                  We received a request to reset your BR30 Market Scanner password.<br /><br />
                  Please use the OTP below to reset your password.
                </p>

                <div style="margin:35px auto 25px auto;width:280px;background:#000;border:2px solid #00ff88;border-radius:18px;padding:25px 10px;box-shadow:0 0 20px rgba(0,255,136,.2)">
                  <div style="font-size:42px;font-weight:900;color:#00ff88;letter-spacing:10px">
                    ${otp}
                  </div>
                </div>

                <p style="margin:0;color:#ffffff;font-size:15px">
                  ⏳ Valid for 10 minutes
                </p>

                <p style="margin-top:20px;color:#94a3b8;font-size:14px;line-height:24px">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:25px 30px;background:#050505;border-top:1px solid #111;text-align:center">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700">Regards,</p>

                <p style="margin:8px 0 20px;color:#00ff88;font-size:18px;font-weight:900">BR30 Support Team</p>

                <table align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 6px"><a href="https://www.youtube.com/@br30traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.instagram.com/br30Traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.facebook.com/share/1DDJYGYYDf/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://t.me/+hBAT4kWo63A4ZWY1"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://chat.whatsapp.com/B4t82SWBcgOIZTeQXp1wDI"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://x.com/MukeshKuma48159"><img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.threads.com/@br30traderofficial" style="color:#fff;text-decoration:none;font-size:22px;font-weight:bold">@</a></td>
                    <td style="padding:0 6px"><a href="https://www.linkedin.com/in/mukesh-raj-b75a65253"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" /></a></td>
                  </tr>
                </table>

                <p style="margin-top:18px;color:#666;font-size:11px">© BR30 Market Scanner. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const approvedTemplate = (name) => `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>

      <body style="margin:0;padding:0;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:15px">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background: #0a0a0a; border-radius: 24px; overflow: hidden; border: 2px solid #00ff88">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/dw4imlekm/image/upload/v1779141465/Green_burner_qc5lon.jpg" width="100%" style="display: block" />
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 35px; text-align: center">
                <h1 style="margin: 0; color: #00ff88; font-size: 32px; font-weight: 900">BR30 Market Scanner</h1>

                <p style="margin: 30px 0 10px; color: #ffffff; font-size: 18px">Hello <strong>${name}</strong>,</p>

                <p style="margin: 0; color: #cbd5e1; font-size: 16px; line-height: 28px">
                  Congratulations 🎉<br /><br />
                  Your BR30 Market Scanner account has been successfully approved.<br /><br />
                  You can now login and access all scanner features.
                </p>

                <div style="margin: 30px auto 20px; display: inline-block; background: #00ff88; color: #000; padding: 10px 22px; border-radius: 50px; font-size: 14px; font-weight: 900">✅ STATUS : APPROVED</div>

                <br />
                <p style="margin-top: 20px; color: #94a3b8; font-size: 14px; line-height: 24px">Welcome to BR30 Market Scanner.</p>
                <a href="https://br30scanner.vercel.app/login" target="_blank" style="display: inline-block; margin-top: 10px; background: #00ff88; color: #000; text-decoration: none; padding: 14px 30px; border-radius: 12px; font-size: 16px; font-weight: 900"> 🚀 LOGIN TO DASHBOARD </a>

              </td>
            </tr>

            <tr>
              <td style="padding: 25px 30px; background: #050505; border-top: 1px solid #111; text-align: center">
                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 700">Regards,</p>

                <p style="margin: 8px 0 20px; color: #00ff88; font-size: 18px; font-weight: 900">BR30 Support Team</p>

                <table align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 6px">
                      <a href="https://www.youtube.com/@br30traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://www.instagram.com/br30Traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://www.facebook.com/share/1DDJYGYYDf/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://t.me/+hBAT4kWo63A4ZWY1"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://chat.whatsapp.com/B4t82SWBcgOIZTeQXp1wDI"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://x.com/MukeshKuma48159"><img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" width="24" /></a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://www.threads.com/@br30traderofficial" style="color: #fff; text-decoration: none; font-size: 22px; font-weight: bold"> @ </a>
                    </td>
                    <td style="padding: 0 6px">
                      <a href="https://www.linkedin.com/in/mukesh-raj-b75a65253"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" /></a>
                    </td>
                  </tr>
                </table>

                <p style="margin-top: 18px; color: #666; font-size: 11px">© BR30 Market Scanner. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const unapprovedTemplate = (name) => `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>

      <body style="margin:0;padding:0;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:15px">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background: #0a0a0a; border-radius: 24px; overflow: hidden; border: 2px solid #ff3b3b">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/dw4imlekm/image/upload/v1779141465/Green_burner_qc5lon.jpg" width="100%" style="display: block" />
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 35px; text-align: center">
                <h1 style="margin: 0; color: #ff3b3b; font-size: 32px; font-weight: 900">BR30 Market Scanner</h1>

                <p style="margin: 30px 0 10px; color: #ffffff; font-size: 18px">Hello <strong>${name}</strong>,</p>

                <p style="margin: 0; color: #cbd5e1; font-size: 16px; line-height: 28px">
                  Your BR30 Market Scanner account access has been unapproved.
                  <br /><br />
                  You currently do not have access to scanner features.
                  <br /><br />
                  If you believe this action was taken by mistake, please contact our support team.
                </p>

                <div style="margin: 30px auto 20px; display: inline-block; background: #ff3b3b; color: #fff; padding: 10px 22px; border-radius: 50px; font-size: 14px; font-weight: 900">❌ STATUS : UNAPPROVED</div>

                <br />

                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=support.br30trader@gmail.com&su=BR30%20Stock%20Scanner%20Account%20Review%20Request"
                  target="_blank"
                  style="display: inline-block; margin-top: 10px; background: #ff3b3b; color: #fff; text-decoration: none; padding: 14px 30px; border-radius: 12px; font-size: 16px; font-weight: 900">
                  📩 CONTACT SUPPORT
                </a>

                <p style="margin-top: 20px; color: #94a3b8; font-size: 14px; line-height: 24px">BR30 Support Team is available to assist you.</p>
              </td>
            </tr>

            <tr>
              <td style="padding: 25px 30px; background: #050505; border-top: 1px solid #111; text-align: center">
                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 700">Regards,</p>

                <p style="margin: 8px 0 20px; color: #ff3b3b; font-size: 18px; font-weight: 900">BR30 Support Team</p>

                <table align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 6px">
                      <a href="https://www.youtube.com/@br30traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.instagram.com/br30Traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.facebook.com/share/1DDJYGYYDf/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://t.me/+hBAT4kWo63A4ZWY1"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://chat.whatsapp.com/B4t82SWBcgOIZTeQXp1wDI"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://x.com/MukeshKuma48159"><img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" width="24" /></a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.threads.com/@br30traderofficial" style="color: #fff; text-decoration: none; font-size: 22px; font-weight: bold">@</a>
                    </td>

                    <td style="padding: 0 6px">
                      <a href="https://www.linkedin.com/in/mukesh-raj-b75a65253"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" /></a>
                    </td>
                  </tr>
                </table>

                <p style="margin-top: 18px; color: #666; font-size: 11px">© BR30 Market Scanner. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const bulkMailTemplate = (name, message) => {
  const safeName = name || "Trader";
  const safeMessage = String(message || "").replace(/\n/g, "<br/>");

  return `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#05070b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#07130d,#101827);border:1px solid #1f3b31;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.45);">
      <div style="padding:26px 24px;border-bottom:1px solid #172438;text-align:center;">
        <h1 style="margin:0;color:#00ff88;font-size:28px;font-weight:900;letter-spacing:1px;">BR30 SCANNER</h1>
        <p style="margin:8px 0 0;color:#ffd700;font-size:13px;font-weight:800;letter-spacing:1.5px;">PREMIUM MARKET ALERT DESK</p>
      </div>

      <div style="padding:28px 24px;color:#ffffff;">
        <p style="margin:0 0 14px;color:#d7e2ef;font-size:16px;font-weight:700;">Hello ${safeName},</p>

        <div style="background:#0b111c;border:1px solid #1c2e44;border-radius:18px;padding:20px;color:#d7e2ef;font-size:15px;line-height:1.8;">
          ${safeMessage}
        </div>

        <div style="margin-top:22px;padding:16px;border-radius:16px;background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.25);">
          <p style="margin:0;color:#00ff88;font-size:14px;font-weight:900;">BR30 Scanner Pro</p>
          <p style="margin:6px 0 0;color:#aeb8c5;font-size:13px;line-height:1.6;">Live scanner, alerts, heatmap, TradingView popup aur multi-market tracking ke liye dashboard regularly check karte rahiye.</p>
        </div>

        <p style="margin:24px 0 0;color:#ffffff;font-size:14px;font-weight:800;">Regards,<br/><span style="color:#00ff88;">BR30 Support Team</span></p>
      </div>

      <div style="padding:18px 24px;background:#080d14;border-top:1px solid #172438;text-align:center;">
        <p style="margin:0;color:#9ca9b7;font-size:12px;line-height:1.6;">This email was sent by BR30 Scanner Admin Desk. Please ignore if this message is not relevant to your account.</p>
        <p style="margin:10px 0 0;color:#ffd700;font-size:11px;font-weight:900;letter-spacing:1px;">© ${new Date().getFullYear()} BR30 Scanner. All Rights Reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const br30InfinityAccessTemplate = ({ name = "Trader", tradingViewUsername = "-", planName = "BR30 Market Scanner Monthly Plan", subscriptionEndDate = "-" }) => {
  const supportEmail = "support.br30trader@gmail.com";
  const supportWhatsapp = "916200986380";
  const dhanReferralLink = "https://join.dhan.co/?invite=ZUFUW59514";

  const emailSubject = encodeURIComponent("BR30 Infinity Sniper Access Support");
  const emailBody = encodeURIComponent(
    `Hello BR30 Support Team,\n\nMy BR30 Market Scanner subscription is active.\n\nName: ${name}\nTradingView Username: ${tradingViewUsername}\nPlan: ${planName}\nValid Till: ${subscriptionEndDate}\n\nPlease activate my BR30 Infinity Sniper Indicator access.\n\nThank you.`
  );

  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=${emailSubject}&body=${emailBody}`;

  const whatsappText = encodeURIComponent(`Hello BR30 Support Team,\n\nMy BR30 Market Scanner subscription is active.\n\nName: ${name}\nTradingView Username: ${tradingViewUsername}\nPlan: ${planName}\nValid Till: ${subscriptionEndDate}\n\nPlease activate my BR30 Infinity Sniper Indicator access.`);

  const whatsappLink = `https://wa.me/${supportWhatsapp}?text=${whatsappText}`;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>

  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#050505;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:15px;background:#050505;">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:24px;overflow:hidden;border:2px solid #00ff88;">
            
            <tr>
              <td>
                <img src="https://res.cloudinary.com/dw4imlekm/image/upload/v1779141465/Green_burner_qc5lon.jpg" width="100%" style="display:block;" />
              </td>
            </tr>

            <tr>
              <td style="padding:40px 35px;text-align:center;">
                <h1 style="margin:0;color:#00ff88;font-size:30px;font-weight:900;">BR30 Market Scanner</h1>
                <h2 style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Subscription Activated</h2>

                <p style="margin:28px 0 10px;color:#ffffff;font-size:18px;">Hello <strong>${name}</strong>,</p>

                <p style="margin:0;color:#cbd5e1;font-size:16px;line-height:28px;">
                  Your BR30 Market Scanner subscription is now active.
                  <br />
                  Your request for <strong style="color:#00ff88;">BR30 Infinity Sniper Indicator</strong> access has been received.
                  <br /><br />
                  Our support team will verify your TradingView username and activate your invite-only indicator access soon.
                </p>

                <div style="margin:28px auto 18px;display:inline-block;background:#00ff88;color:#000;padding:10px 22px;border-radius:50px;font-size:14px;font-weight:900;">
                  STATUS : SUBSCRIPTION ACTIVE
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:25px;background:#050505;border:1px solid #111;border-radius:16px;padding:18px;text-align:left;">
                  <tr>
                    <td style="color:#94a3b8;font-size:14px;line-height:26px;">
                      <p style="margin:0;"><strong style="color:#ffffff;">Plan:</strong> ${planName}</p>
                      <p style="margin:0;"><strong style="color:#ffffff;">TradingView Username:</strong> ${tradingViewUsername}</p>
                      <p style="margin:0;"><strong style="color:#ffffff;">Valid Till:</strong> ${subscriptionEndDate}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 12px;color:#ffffff;font-size:16px;font-weight:800;">
                  How to use after access activation:
                </p>

                <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:26px;">
                  Open TradingView → Indicators → Invite-only Scripts → BR30 Infinity Sniper
                </p>

                <div style="margin-top:28px;">
                  <a href="${gmailLink}" target="_blank" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:900;margin:6px;">
                    Contact Support
                  </a>

                  <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25D366;color:#000;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:900;margin:6px;">
                    WhatsApp Support
                  </a>
                </div>

                <div style="margin-top:28px;padding:20px;background:#07130d;border:1px solid #00ff8844;border-radius:16px;">
                  <p style="margin:0 0 10px;color:#00ff88;font-size:16px;font-weight:900;">
                    Open Dhan Account
                  </p>

                  <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;line-height:24px;">
                    Use BR30 referral link to open your Dhan account.
                  </p>

                  <a href="${dhanReferralLink}" target="_blank" style="display:inline-block;background:#ffffff;color:#000;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:900;">
                    Open Dhan Account
                  </a>
                </div>

                <p style="margin-top:22px;color:#94a3b8;font-size:14px;line-height:24px;">
                  BR30 Support Team is available to assist you.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:25px 30px;background:#050505;border-top:1px solid #111;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">Regards,</p>
                <p style="margin:8px 0 20px;color:#00ff88;font-size:18px;font-weight:900;">BR30 Support Team</p>

                <table align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 6px"><a href="https://www.youtube.com/@br30traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.instagram.com/br30Traderofficial"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.facebook.com/share/1DDJYGYYDf/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://t.me/+hBAT4kWo63A4ZWY1"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://chat.whatsapp.com/B4t82SWBcgOIZTeQXp1wDI"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://x.com/MukeshKuma48159"><img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" width="24" /></a></td>
                    <td style="padding:0 6px"><a href="https://www.threads.com/@br30traderofficial" style="color:#fff;text-decoration:none;font-size:22px;font-weight:bold;">@</a></td>
                    <td style="padding:0 6px"><a href="https://www.linkedin.com/in/mukesh-raj-b75a65253"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" /></a></td>
                  </tr>
                </table>

                <p style="margin-top:18px;color:#666;font-size:11px;">© BR30 Market Scanner. All Rights Reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

module.exports = { otpTemplate, forgotPasswordTemplate, approvedTemplate, unapprovedTemplate, bulkMailTemplate, br30InfinityAccessTemplate };
