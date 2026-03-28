/**
 * Cloudflare Pages Function: POST /api/whitepaper
 * 白皮書下載 Lead Magnet for learnai.club
 *
 * Required env vars (set in Cloudflare Pages dashboard):
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token
 *   TELEGRAM_CHAT_ID    — Telegram chat ID (default: 7854440375)
 */

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendWelcomeEmail(origin, { email, name }) {
  try {
    const res = await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, template: 'welcome', name: name || '你好' }),
    });
    const json = await res.json();
    if (json.success) {
      console.log('D0 welcome email sent to', email, 'via', json.provider);
    } else {
      console.warn('D0 welcome email failed:', json.error);
    }
  } catch (err) {
    console.error('sendWelcomeEmail error:', err);
  }
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

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://learnai.club',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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

  const { email, company, title } = body;

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫有效的 Email 地址。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Send Telegram notification (non-blocking)
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '7854440375';

  if (botToken) {
    const companyStr = company ? `🏢 公司：${escapeHtml(company)}\n` : '';
    const titleStr = title ? `💼 職稱：${escapeHtml(title)}\n` : '';
    const msg = `📄 <b>白皮書新下載</b>

📧 Email：${escapeHtml(email)}
${companyStr}${titleStr}
🕐 時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}

<a href="https://learnai.club/whitepaper-content">查看白皮書內容 →</a>`;
    sendTelegram(botToken, chatId, msg).catch(e => console.error('Telegram notify failed:', e));
  } else {
    console.warn('TELEGRAM_BOT_TOKEN not set, skipping notification');
  }

  // Send D0 welcome email (non-blocking)
  const origin = new URL(request.url).origin;
  sendWelcomeEmail(origin, { email, name: company || email }).catch(e =>
    console.error('D0 welcome email failed:', e)
  );

  // Return redirect URL to whitepaper content page
  return new Response(
    JSON.stringify({
      success: true,
      redirect: '/whitepaper-content',
    }),
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
