/**
 * Cloudflare Pages Function: POST /api/email-scheduler
 * Email 排程管理（手動觸發版）
 *
 * 用途：記錄新用戶的 email 序列起始時間，並觸發 D0 welcome email。
 * 未來可接 Cloudflare Cron Triggers 自動發 D3/D7/D14/D21。
 *
 * Required env vars:
 *   RESEND_API_KEY       — Resend API key（可選）
 *   TELEGRAM_BOT_TOKEN   — Telegram bot token
 *   TELEGRAM_CHAT_ID     — Telegram chat ID (default: 7854440375)
 *
 * POST /api/email-scheduler
 * Body: { email, name, source }
 *   source: whitepaper | ai-checkup
 *
 * GET /api/email-scheduler?action=pending
 *   列出待發的 email（TODO: 需要 KV storage）
 */

// Email sequence schedule
const EMAIL_SEQUENCE = [
  { template: 'welcome',      day: 0  },
  { template: 'case-study',   day: 3  },
  { template: 'quick-win',    day: 7  },
  { template: 'social-proof', day: 14 },
  { template: 'final-push',   day: 21 },
];

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegram(botToken, chatId, message) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
  const json = await res.json();
  if (!json.ok) console.error('Telegram error:', JSON.stringify(json));
  return json.ok;
}

async function triggerSendEmail(origin, { to, template, name }) {
  const res = await fetch(`${origin}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, template, name }),
  });
  const json = await res.json();
  return json;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://learnai.club',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: '無效的請求格式。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { email, name, source } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫有效的 Email 地址。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const recipientName = name || '你好';
  const signupAt = new Date().toISOString();

  // TODO: Store { email, name, source, signupAt } in Cloudflare KV for D3/D7/D14/D21 scheduling
  // Example KV usage (requires KV binding 'EMAIL_SEQUENCE_KV'):
  // await env.EMAIL_SEQUENCE_KV?.put(email, JSON.stringify({ name, source, signupAt }));

  // Trigger D0 welcome email immediately
  const origin = new URL(request.url).origin;
  let d0Result;
  try {
    d0Result = await triggerSendEmail(origin, { to: email, template: 'welcome', name: recipientName });
  } catch (err) {
    console.error('D0 send failed:', err);
    d0Result = { success: false, error: String(err) };
  }

  // Notify about pending D3/D7/D14/D21
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '7854440375';

  if (botToken) {
    const upcoming = EMAIL_SEQUENCE
      .filter(e => e.day > 0)
      .map(e => `D${e.day}: ${e.template}`)
      .join('\n');

    const sourceLabel = source === 'whitepaper' ? '📄 白皮書下載' : source === 'ai-checkup' ? '🔬 AI 健檢' : source || '未知';
    const msg = `📅 <b>Email 序列啟動</b>

📧 ${escapeHtml(email)}（${escapeHtml(recipientName)}）
📍 來源：${escapeHtml(sourceLabel)}
⏰ 啟動時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}

✅ D0 歡迎信：${d0Result?.success ? '已發送' : '失敗 — ' + (d0Result?.error || '未知錯誤')}

⏳ <b>待排程（需要 Cron 或 KV）：</b>
${escapeHtml(upcoming)}`;
    sendTelegram(botToken, chatId, msg).catch(e => console.error('Telegram notify failed:', e));
  }

  return new Response(
    JSON.stringify({
      success: true,
      d0: d0Result,
      scheduled: EMAIL_SEQUENCE.filter(e => e.day > 0).map(e => ({
        template: e.template,
        day: e.day,
        status: 'TODO: 需要 Cron Trigger 或 KV 排程',
      })),
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
