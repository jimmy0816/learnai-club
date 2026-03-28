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

// 產業 benchmark 數據（用於報告中的對比）
const INDUSTRY_BENCHMARKS = {
  '製造業': { avgScore: 4.8, avgMonthlyWaste: { '1-10': 8, '11-50': 25, '51-200': 80, '200+': 200 }, aiAdoption: '42%', topUseCase: 'AI 品檢 + 預測維護' },
  '零售 / 電商': { avgScore: 5.5, avgMonthlyWaste: { '1-10': 6, '11-50': 20, '51-200': 60, '200+': 150 }, aiAdoption: '51%', topUseCase: 'AI 客服 + 庫存預測' },
  '服務業': { avgScore: 4.2, avgMonthlyWaste: { '1-10': 5, '11-50': 18, '51-200': 50, '200+': 120 }, aiAdoption: '35%', topUseCase: 'AI 排程 + 客戶管理' },
  '金融 / 保險': { avgScore: 6.1, avgMonthlyWaste: { '1-10': 10, '11-50': 35, '51-200': 100, '200+': 300 }, aiAdoption: '58%', topUseCase: 'AI 風控 + 文件審查' },
  '餐飲': { avgScore: 3.5, avgMonthlyWaste: { '1-10': 4, '11-50': 15, '51-200': 40, '200+': 100 }, aiAdoption: '28%', topUseCase: 'AI 排班 + LINE 訂位' },
  '物流': { avgScore: 5.0, avgMonthlyWaste: { '1-10': 7, '11-50': 22, '51-200': 70, '200+': 180 }, aiAdoption: '45%', topUseCase: 'AI 路線優化 + 自動派單' },
  '科技 / 軟體': { avgScore: 7.2, avgMonthlyWaste: { '1-10': 5, '11-50': 15, '51-200': 45, '200+': 100 }, aiAdoption: '68%', topUseCase: 'AI 程式審查 + 自動測試' },
  '其他': { avgScore: 4.5, avgMonthlyWaste: { '1-10': 6, '11-50': 20, '51-200': 55, '200+': 130 }, aiAdoption: '38%', topUseCase: 'AI 客服 + 文件處理' },
};

const PAIN_COST_MAP = {
  '找不到人 / 缺工': { costRatio: 0.30, aiSaving: '40-60%', desc: '人力招募+加班成本' },
  '客服回覆太慢 / 客訴多': { costRatio: 0.25, aiSaving: '50-70%', desc: '客服人力+客戶流失' },
  '報表 / 文件做太久': { costRatio: 0.15, aiSaving: '60-80%', desc: '行政人力+加班費' },
  '庫存管理混亂': { costRatio: 0.12, aiSaving: '30-50%', desc: '庫存損耗+缺貨損失' },
  '內部溝通效率差': { costRatio: 0.10, aiSaving: '20-40%', desc: '會議時間+溝通成本' },
  '業務追蹤困難': { costRatio: 0.15, aiSaving: '30-50%', desc: '業務漏單+跟進遺漏' },
  '老員工離職知識就沒了': { costRatio: 0.08, aiSaving: '50-70%', desc: '知識流失+新人培訓' },
  '想用 AI 但不知從哪開始': { costRatio: 0.05, aiSaving: '20-30%', desc: '決策延遲成本' },
};

function buildPrompt({ industry, size, painPoints, tools }) {
  const bench = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  const monthlyWaste = bench.avgMonthlyWaste[size] || 20;

  // 計算每個痛點的成本
  const painCostDetails = painPoints.map(p => {
    const info = PAIN_COST_MAP[p] || { costRatio: 0.10, aiSaving: '30-50%', desc: p };
    const cost = Math.round(monthlyWaste * info.costRatio);
    return `- ${p}：每月約 NT$${cost} 萬（${info.desc}），AI 可節省 ${info.aiSaving}`;
  }).join('\n');

  const totalWaste = monthlyWaste;
  const estimatedSaving = Math.round(totalWaste * 0.45);

  return `你是台灣頂尖的企業 AI 導入顧問。你的報告以「具體數字」和「同業對比」聞名，讓老闆看完會想截圖傳給合夥人。

## 企業資訊
- 產業：${industry}
- 規模：${size} 人
- 痛點：${painPoints.join('、')}
- 現有工具：${tools.join('、')}

## 同業 Benchmark 數據（寫進報告）
- ${industry} 平均 AI 成熟度：${bench.avgScore}/10
- ${industry} AI 導入率：${bench.aiAdoption}
- ${industry} 最熱門 AI 用途：${bench.topUseCase}
- ${size} 人規模企業，可自動化工作的平均月成本：約 NT$${totalWaste} 萬
- 各痛點成本拆解：
${painCostDetails}

## 請嚴格按照以下格式輸出（繁體中文，專業但說人話）：

## 📉 你正在燒的隱形成本

用表格呈現這家公司「目前估計成本 vs AI 導入後 vs 每月省下」。
根據他的痛點和規模，給出 3-4 行具體項目。
最後一行加粗合計。
末尾加一句：「⚠️ 每延遲一個月導入 = 多燒 NT$${estimatedSaving} 萬」

## 🏆 AI 成熟度：X / 10

根據他的現有工具和痛點，給 1-10 分。
用文字進度條對比（不要用 emoji 方塊，用中文描述）：
- 他的分數 vs 同業平均 ${bench.avgScore} 分 vs 領先者（自己估一個合理數字）
- 說明差距代表什麼，以及「好消息是從 X 到 Y 只需要 N 個月」

## 🎯 最該優先做的 3 件事（按 ROI 排序）

每件事包含：
1. **標題**（標注 [最高 ROI] / [最快見效] / [長期價值]）
2. **📌 為什麼是優先**：結合他填的痛點，說明為什麼這個 ROI 最高（2 句）
3. **💰 投入 vs 回報**：具體金額 — 導入成本 NT$X + 月費 NT$X → 預估月省 NT$X → 回本時間
4. **🛠️ 具體怎麼做**：4 個步驟，每步一句話，要具體到工具名稱

## 🗓️ 你的專屬 90 天路線圖

用 Week 1-2 / Week 3-4 / Month 2 / Month 3 四段，每段包含：
- 具體行動（不是「導入 AI」，是「設定 LINE OA 自動回應 + 整理 30 個 FAQ」）
- 目標指標（如：客服回覆時間從 4 小時 → 10 分鐘）

## 💰 12 個月 ROI 預測

用表格：月份（第1/3/6/12月）× 累計投入 × 累計節省 × 淨效益
最後算出年 ROI 百分比。
數字要根據他的規模和痛點計算，保守合理。

## 重要規則
- 所有金額都用 NT$，以「萬」為單位（如 NT$4.8 萬）
- 數字要具體但用「約」「預估」修飾
- 工具名稱必須真實存在
- 不要有免責聲明或附錄
- 報告直接結束在 ROI 表格，不要加結尾語（CTA 由前端加）
- 語氣像一個很厲害的顧問在跟老闆一對一簡報，不是在寫論文`;
}
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
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
