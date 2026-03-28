/**
 * Cloudflare Pages Function: POST /api/send-email
 * 發送 Email Nurture 序列
 *
 * Required env vars:
 *   RESEND_API_KEY       — Resend API key (re_*)
 *   RESEND_FROM_EMAIL    — 發信地址 (default: team@learnai.club)
 *   TELEGRAM_BOT_TOKEN   — 若無 Resend，改用 Telegram 通知 Jimmy 手動發
 *   TELEGRAM_CHAT_ID     — Telegram chat ID (default: 7854440375)
 *
 * POST body: { to, template, name, subject? }
 *   template: welcome | case-study | quick-win | social-proof | final-push
 */

// Email subjects for each template
const SUBJECTS = {
  'welcome':      '歡迎！你的 AI 導入白皮書在這裡 📄',
  'case-study':   '這家 50 人公司用 AI 每月省了 NT$15 萬 💰',
  'quick-win':    '5 分鐘，讓 AI 幫你自動產週報 📊',
  'social-proof': '你的競爭對手可能已經在用 AI 了 🏃',
  'final-push':   '最後問一次：需要幫忙嗎？🙋',
};

// Email sequence schedule (days after signup)
const SCHEDULE = {
  'welcome':      0,
  'case-study':   3,
  'quick-win':    7,
  'social-proof': 14,
  'final-push':   21,
};

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

async function fetchEmailTemplate(template) {
  // In Cloudflare Pages, static assets under src/ are not directly accessible at runtime.
  // The HTML templates are embedded here as a fallback.
  // For production, consider storing templates in KV or fetching from CDN.

  // The templates are served from /email-sequences/ public path if copied to public/
  // Otherwise, use the inline versions below.
  const templates = await getInlineTemplates();
  return templates[template] || null;
}

function getInlineTemplates() {
  // Inline template map — keeps the Cloudflare Worker self-contained
  // These are the canonical templates; update here if content changes.
  return {
    'welcome': `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:580px;width:100%;"><tr><td style="background-color:#0f172a;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Learn AI Club</p></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">嗨 {name}，</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">感謝你下載《2026 台灣企業 AI 導入白皮書》。</p><p style="margin:0 0 24px;color:#1e293b;font-size:16px;line-height:1.6;">你可以在這裡閱讀線上完整版：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;"><a href="https://learnai.club/whitepaper-content" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">📄 閱讀白皮書 →</a></td></tr></table><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">接下來幾天，我會分享一些台灣企業導入 AI 的真實案例和實用技巧。</p><p style="margin:0 0 32px;color:#1e293b;font-size:16px;line-height:1.6;">如果你有任何問題，直接回覆這封信就好。</p><p style="margin:0;color:#1e293b;font-size:16px;line-height:1.6;">— Learn AI Club 團隊</p></td></tr><tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">你收到這封信是因為你在 <a href="https://learnai.club" style="color:#94a3b8;">learnai.club</a> 填寫了表單。如果不想繼續收到信件，請回覆「取消訂閱」。</p></td></tr></table></td></tr></table></body></html>`,

    'case-study': `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:580px;width:100%;"><tr><td style="background-color:#0f172a;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Learn AI Club</p></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">嗨 {name}，</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">上次分享了白皮書，今天來看一個真實案例：一家 50 人的製造業公司，最困擾的是：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 16px;background-color:#fef2f2;border-radius:6px;padding:16px;width:100%;box-sizing:border-box;"><tr><td style="color:#dc2626;font-size:15px;padding:4px 0;">❌ 品檢全靠人眼，漏檢率 4%</td></tr><tr><td style="color:#dc2626;font-size:15px;padding:4px 0;">❌ 業務報價要花 2 小時翻舊資料</td></tr><tr><td style="color:#dc2626;font-size:15px;padding:4px 0;">❌ 客服 LINE 每天 200 則回不完</td></tr></table><p style="margin:0 0 8px;color:#1e293b;font-size:16px;line-height:1.6;">他們做了 3 件事：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 16px;background-color:#f0fdf4;border-radius:6px;padding:16px;width:100%;box-sizing:border-box;"><tr><td style="color:#16a34a;font-size:15px;padding:4px 0;">✅ AI 品檢系統（漏檢率降到 0.5%）</td></tr><tr><td style="color:#16a34a;font-size:15px;padding:4px 0;">✅ ChatGPT + Google Sheets 自動報價（2 小時 → 5 分鐘）</td></tr><tr><td style="color:#16a34a;font-size:15px;padding:4px 0;">✅ LINE bot 自動回覆（處理 80% 重複問題）</td></tr></table><p style="margin:0 0 24px;color:#1e293b;font-size:16px;line-height:1.6;">結果：每月省下 2 個全職人力，約 NT$15 萬。</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:600;">想知道你的公司哪些流程最值得 AI 化？</p><table cellpadding="0" cellspacing="0" style="margin:0 0 32px;"><tr><td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;"><a href="https://learnai.club/ai-checkup" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">免費 AI 健檢（2 分鐘）→</a></td></tr></table><p style="margin:0;color:#1e293b;font-size:16px;line-height:1.6;">— Learn AI Club 團隊</p></td></tr><tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">你收到這封信是因為你在 <a href="https://learnai.club" style="color:#94a3b8;">learnai.club</a> 填寫了表單。如果不想繼續收到信件，請回覆「取消訂閱」。</p></td></tr></table></td></tr></table></body></html>`,

    'quick-win': `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:580px;width:100%;"><tr><td style="background-color:#0f172a;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Learn AI Club</p></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">嗨 {name}，</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">今天分享一個你今天就能做的 AI 小技巧：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#eff6ff;border-left:4px solid #2563eb;width:100%;box-sizing:border-box;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 12px;color:#1e40af;font-size:15px;font-weight:700;">【AI 自動產週報】</p><p style="margin:0 0 8px;color:#1e293b;font-size:15px;line-height:1.6;">1. 打開 ChatGPT（免費版就行）</p><p style="margin:0 0 8px;color:#1e293b;font-size:15px;line-height:1.6;">2. 貼上你這週做的事（隨便條列就好）</p><p style="margin:0 0 8px;color:#1e293b;font-size:15px;line-height:1.6;">3. 輸入：「請幫我整理成一份專業的週報，包含本週成果、遇到的問題、下週計畫」</p><p style="margin:0;color:#1e293b;font-size:15px;line-height:1.6;">4. 5 秒後，專業週報就好了</p></td></tr></table><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">如果你的團隊有 5 個人以上，每人每週省 30 分鐘 = 每月省 10 小時。</p><table cellpadding="0" cellspacing="0" style="margin:0 0 32px;"><tr><td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;"><a href="https://learnai.club/blog/rpa-automation-guide-taiwan" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">查看 AI 工具推薦 →</a></td></tr></table><p style="margin:0;color:#1e293b;font-size:16px;line-height:1.6;">— Learn AI Club</p></td></tr><tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">你收到這封信是因為你在 <a href="https://learnai.club" style="color:#94a3b8;">learnai.club</a> 填寫了表單。如果不想繼續收到信件，請回覆「取消訂閱」。</p></td></tr></table></td></tr></table></body></html>`,

    'social-proof': `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:580px;width:100%;"><tr><td style="background-color:#0f172a;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Learn AI Club</p></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">嗨 {name}，</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">分享一個數據：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fefce8;border-radius:6px;width:100%;box-sizing:border-box;"><tr><td style="padding:20px 24px;text-align:center;"><p style="margin:0 0 8px;color:#854d0e;font-size:32px;font-weight:800;">40%</p><p style="margin:0;color:#713f12;font-size:14px;">2026 年台灣中小企業已開始導入某種形式的 AI 工具</p></td></tr></table><p style="margin:0 0 8px;color:#1e293b;font-size:16px;">這不是大企業的專利：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="color:#475569;font-size:15px;padding:4px 0;">• 餐飲業用 AI 排班</td></tr><tr><td style="color:#475569;font-size:15px;padding:4px 0;">• 零售業用 AI 預測庫存</td></tr><tr><td style="color:#475569;font-size:15px;padding:4px 0;">• 服務業用 AI 客服</td></tr></table><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">你不需要花百萬做 AI，但你需要開始。我們幫助過國泰人壽、華碩、TOTO 等企業導入 AI。</p><table cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td style="background-color:#2563eb;border-radius:6px;padding:12px 24px;"><a href="https://learnai.club/consult" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">預約免費 AI 策略諮詢 →</a></td></tr></table><p style="margin:0 0 32px;color:#64748b;font-size:14px;">名額有限，先到先得。</p><p style="margin:0;color:#1e293b;font-size:16px;line-height:1.6;">— Learn AI Club 團隊</p></td></tr><tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">你收到這封信是因為你在 <a href="https://learnai.club" style="color:#94a3b8;">learnai.club</a> 填寫了表單。如果不想繼續收到信件，請回覆「取消訂閱」。</p></td></tr></table></td></tr></table></body></html>`,

    'final-push': `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:580px;width:100%;"><tr><td style="background-color:#0f172a;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Learn AI Club</p></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">嗨 {name}，</p><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">過去三週，我分享了：</p><table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f8fafc;border-radius:6px;width:100%;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 8px;color:#475569;font-size:15px;">📄 AI 導入白皮書</p><p style="margin:0 0 8px;color:#475569;font-size:15px;">💡 50 人公司省 NT$15 萬的案例</p><p style="margin:0 0 8px;color:#475569;font-size:15px;">🔧 5 分鐘 AI 週報技巧</p><p style="margin:0;color:#475569;font-size:15px;">📊 台灣企業 AI 導入趨勢</p></td></tr></table><p style="margin:0 0 16px;color:#1e293b;font-size:16px;line-height:1.6;">如果你還沒開始，可能是因為：<br>• <strong>不確定從哪開始</strong> → <a href="https://learnai.club/ai-checkup" style="color:#2563eb;">免費 AI 健檢</a><br>• <strong>需要有經驗的人帶</strong> → <a href="https://learnai.club/consult" style="color:#2563eb;">預約免費諮詢</a><br>• <strong>還在觀望</strong> → 沒問題，有需要隨時回覆這封信</p><p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">這是系列信的最後一封。之後我偶爾會分享 AI 新工具和案例，如果不想收到可以隨時回覆「取消訂閱」。</p><p style="margin:0 0 32px;color:#1e293b;font-size:16px;line-height:1.6;">祝你的企業 AI 轉型順利 🚀</p><p style="margin:0;color:#1e293b;font-size:16px;line-height:1.6;">— Learn AI Club</p></td></tr><tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">你收到這封信是因為你在 <a href="https://learnai.club" style="color:#94a3b8;">learnai.club</a> 填寫了表單。如果不想繼續收到信件，請回覆「取消訂閱」。</p></td></tr></table></td></tr></table></body></html>`,
  };
}

async function sendViaResend(apiKey, { to, subject, html, fromEmail }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail || 'Learn AI Club <team@learnai.club>',
      to: [to],
      subject,
      html,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Resend error ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
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

  const { to, template, name, subject: customSubject } = body;

  // Validate inputs
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return new Response(
      JSON.stringify({ success: false, error: '請填寫有效的 Email 地址。' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (!template || !SUBJECTS[template]) {
    return new Response(
      JSON.stringify({ success: false, error: `無效的模板名稱。可用：${Object.keys(SUBJECTS).join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const recipientName = name || '你好';
  const subject = customSubject || SUBJECTS[template];

  // Fetch and render template
  const templateHtml = await fetchEmailTemplate(template);
  if (!templateHtml) {
    return new Response(
      JSON.stringify({ success: false, error: '模板讀取失敗。' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Replace {name} placeholder
  const html = templateHtml.replace(/\{name\}/g, escapeHtml(recipientName));

  const resendApiKey = env.RESEND_API_KEY;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '7854440375';

  if (resendApiKey) {
    // Send via Resend
    try {
      const result = await sendViaResend(resendApiKey, {
        to,
        subject,
        html,
        fromEmail: env.RESEND_FROM_EMAIL,
      });
      return new Response(
        JSON.stringify({ success: true, provider: 'resend', id: result.id }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err) {
      console.error('Resend failed:', err);
      // Fall through to Telegram fallback
    }
  }

  // Fallback: Telegram notification for manual sending
  if (botToken) {
    const scheduleDay = SCHEDULE[template] ?? '?';
    const msg = `📧 <b>Email 待手動發送（D${scheduleDay}）</b>

📮 收件者：${escapeHtml(to)}
👤 姓名：${escapeHtml(recipientName)}
📝 模板：${template}
📌 主旨：${escapeHtml(subject)}

⚠️ RESEND_API_KEY 未設定，請手動發送此 email。`;
    await sendTelegram(botToken, chatId, msg).catch(e => console.error('Telegram fallback failed:', e));

    return new Response(
      JSON.stringify({ success: true, provider: 'telegram_fallback', message: 'Telegram 通知已發送，請手動寄信。' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: '未設定 RESEND_API_KEY 或 TELEGRAM_BOT_TOKEN。' }),
    { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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
