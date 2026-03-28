/**
 * Cloudflare Pages Function: POST /api/ai-checkup
 * AI 健檢診斷報告產出器 for learnai.club
 *
 * Required env vars (set in Cloudflare Pages dashboard):
 *   ANTHROPIC_API_KEY   — Anthropic API key (sk-ant-*)
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token
 *   TELEGRAM_CHAT_ID    — Telegram chat ID (default: 7854440375)
 */

// Simple in-memory rate limiting (per worker instance)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(ts => now - ts < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

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

function buildPrompt({ industry, size, painPoints, tools }) {
  return `你是台灣企業 AI 導入顧問，專門幫中小企業評估 AI 自動化機會。

根據以下企業資訊，產出一份「AI 導入診斷報告」：

產業：${industry}
公司規模：${size}
主要痛點：${painPoints.join('、')}
現有工具：${tools.join('、')}

請產出以下格式的報告（使用繁體中文，語氣專業但親民）：

## 📊 AI 成熟度評分

給這家公司 1-10 分的 AI 成熟度評分，並簡要說明原因（2-3 句）。

## 🎯 最值得 AI 化的 3 個流程

針對這家公司的痛點和產業特性，列出最值得用 AI 優化的前 3 個流程：

每個流程包含：
1. 流程名稱
2. 目前的問題（1 句）
3. AI 怎麼解（具體工具或方案，2-3 句）
4. 預估效益（節省多少時間/人力/成本，用百分比或具體數字）

## 🛠️ 推薦工具

免費工具（立刻可以開始用）：列 2-3 個
付費方案（需要專業導入）：列 2-3 個

## 🗓️ 30/60/90 天導入路線圖

- 第 1-30 天：[具體行動]
- 第 31-60 天：[具體行動]
- 第 61-90 天：[具體行動]

## 💰 預估 ROI

以這家公司的規模和痛點，估算導入 AI 後：
- 預估每月節省的人力成本
- 預估投入成本
- 回本時間

注意：數字要合理，不要誇大。用「約」「預估」等詞彙，不要給出精確到個位數的假數字。`;
}

function extractScore(reportText) {
  // Try to extract the AI maturity score from the report
  const match = reportText.match(/(\d+)\s*(?:\/\s*10|分)/);
  return match ? match[1] : '?';
}

async function callAnthropic(apiKey, prompt) {
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (networkErr) {
    console.error('[ai-checkup] Network error calling Anthropic:', networkErr.message);
    throw new Error(`Network error calling Anthropic: ${networkErr.message}`);
  }

  if (!response.ok) {
    let errBody = '';
    try {
      errBody = await response.text();
    } catch (_) {}
    console.error(`[ai-checkup] Anthropic API error status=${response.status} body=${errBody}`);
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  let json;
  try {
    json = await response.json();
  } catch (parseErr) {
    console.error('[ai-checkup] Failed to parse Anthropic response JSON:', parseErr.message);
    throw new Error('Failed to parse Anthropic response');
  }

  const text = json.content?.[0]?.text || '';
  if (!text) {
    console.error('[ai-checkup] Anthropic returned empty content. Full response:', JSON.stringify(json));
    throw new Error('Anthropic returned empty content');
  }

  console.log(`[ai-checkup] Anthropic call success. tokens_used=${json.usage?.output_tokens || 'unknown'}`);
  return text;
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

function formatTelegramNotification({ company, industry, name, title, email, size, painPoints, tools, score }) {
  return `🔬 <b>AI 健檢新填寫</b>

🏢 ${escapeHtml(company)}（${escapeHtml(industry)}）
👤 ${escapeHtml(name)}（${escapeHtml(title)}）
📧 ${escapeHtml(email)}
👥 規模：${escapeHtml(size)}
🎯 痛點：${escapeHtml(painPoints.join('、'))}
🛠️ 現有工具：${escapeHtml(tools.join('、'))}

📊 AI 成熟度：${score}/10`;
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

  const { industry, size, painPoints, tools, company, name, title, email, phone } = body;

  // Validate required fields
  if (!industry || !size || !painPoints?.length || !tools?.length || !company || !name || !title || !email) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫所有必填欄位。' }),
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

  // Check Anthropic API key
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return new Response(
      JSON.stringify({ success: false, error: '伺服器設定錯誤，請稍後再試。' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Build prompt and call Anthropic
  let report = '';
  try {
    const prompt = buildPrompt({ industry, size, painPoints, tools });
    report = await callAnthropic(apiKey, prompt);
  } catch (err) {
    console.error('[ai-checkup] Report generation failed:', err.message, err.stack || '');
    return new Response(
      JSON.stringify({ success: false, error: 'AI 報告產出失敗，請稍後再試或直接預約諮詢。' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Extract score from report for Telegram notification
  const score = extractScore(report);

  // Send Telegram notification (non-blocking failure)
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '7854440375';

  if (botToken) {
    const msg = formatTelegramNotification({
      company, industry, name, title, email, size,
      painPoints: Array.isArray(painPoints) ? painPoints : [painPoints],
      tools: Array.isArray(tools) ? tools : [tools],
      score,
    });
    sendTelegram(botToken, chatId, msg).catch(e => console.error('Telegram notify failed:', e));
  } else {
    console.warn('TELEGRAM_BOT_TOKEN not set, skipping notification');
  }

  // Send D0 welcome email (non-blocking)
  const origin = new URL(request.url).origin;
  sendWelcomeEmail(origin, { email, name }).catch(e =>
    console.error('D0 welcome email failed:', e)
  );

  // Return report
  return new Response(
    JSON.stringify({ success: true, report }),
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
