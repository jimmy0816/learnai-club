/**
 * Cloudflare Pages Function: POST /api/consult
 * Handles consultation form submissions for learnai.club
 *
 * Required env vars (set in Cloudflare Pages dashboard):
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token
 *   TELEGRAM_CHAT_ID    — Telegram chat ID (default: 7854440375)
 *   RESEND_API_KEY      — (optional) Resend API key for email confirmation
 */

// Simple in-memory rate limiting (per worker instance)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 3;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(ts => now - ts < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  // Cleanup old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      const valid = ts.filter(t => now - t < windowMs);
      if (valid.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, valid);
    }
  }

  return timestamps.length <= maxRequests;
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatTelegramMessage(data) {
  const phone = data.phone ? `📱 ${escapeHtml(data.phone)}\n` : '';
  return `📋 <b>learnai.club 新諮詢</b>

🏢 公司：${escapeHtml(data.company)}
👤 ${escapeHtml(data.name)}（${escapeHtml(data.title)}）
📧 ${escapeHtml(data.email)}
${phone}
💬 需求：
${escapeHtml(data.needs)}

🔗 來源：${escapeHtml(data.source || '直接訪問')}`;
}

async function sendTelegram(botToken, chatId, message) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error('Telegram error:', JSON.stringify(json));
  }
  return json.ok;
}

async function sendConfirmationEmail(apiKey, toEmail, data) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Learn AI Club <noreply@learnai.club>',
      to: [toEmail],
      subject: '✅ 已收到您的諮詢申請 — Learn AI Club',
      html: `
        <div style="font-family: 'Noto Sans TC', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
          <div style="background: #1e3a5f; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">✅ 諮詢申請已收到</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px;">親愛的 ${escapeHtml(data.name)} 您好，</p>
            <p style="color: #374151; font-size: 16px;">感謝您預約 Learn AI Club 的免費 AI 策略諮詢！我們已收到您的申請，將在 <strong>24 小時內</strong>與您聯繫。</p>
            
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #1e3a5f; margin-top: 0;">您的申請內容</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">公司</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(data.company)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">姓名</td><td style="padding: 8px 0; color: #111827;">${escapeHtml(data.name)}（${escapeHtml(data.title)}）</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">需求</td><td style="padding: 8px 0; color: #111827;">${escapeHtml(data.needs)}</td></tr>
              </table>
            </div>

            <p style="color: #6b7280; font-size: 14px;">如有任何問題，請直接回覆此信或聯絡 <a href="mailto:contact@learnai.club" style="color: #f97316;">contact@learnai.club</a></p>
          </div>
        </div>
      `,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('Resend error:', JSON.stringify(json));
  }
  return res.ok;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://learnai.club',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Rate limiting
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ success: false, error: '提交過於頻繁，請稍後再試。' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: '無效的請求格式。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { company, name, title, email, phone, needs, source, _honeypot } = body;

  // Honeypot anti-spam check
  if (_honeypot) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Validate required fields
  if (!company || !name || !email || !needs) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫必填欄位：公司名稱、姓名、Email、需求簡述。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫有效的 Email 地址。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const data = { company, name, title: title || '', email, phone: phone || '', needs, source: source || '' };

  // Send Telegram notification
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '7854440375';
  let telegramOk = false;

  if (botToken) {
    const msg = formatTelegramMessage(data);
    telegramOk = await sendTelegram(botToken, chatId, msg);
  } else {
    console.error('TELEGRAM_BOT_TOKEN not set');
  }

  // Send confirmation email via Resend (optional)
  const resendKey = env.RESEND_API_KEY;
  let emailOk = false;

  if (resendKey) {
    emailOk = await sendConfirmationEmail(resendKey, email, data);
  }
  // TODO: Set RESEND_API_KEY in Cloudflare Pages env to enable email confirmation

  if (!telegramOk && !botToken) {
    return new Response(
      JSON.stringify({ success: false, error: '伺服器設定錯誤，請稍後再試或直接寄信至 contact@learnai.club' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, emailSent: emailOk }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://learnai.club',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
