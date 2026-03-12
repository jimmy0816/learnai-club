import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '../public/posters');

// 確保輸出目錄存在
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const posters = [
  {
    id: 'openclaw',
    title: 'OPENCLAW',
    subtitle: '24/7 AI 自動化引擎',
    tools: ['Claude API', 'Node.js', 'Telegram Bot', 'Cron'],
    gradient: 'linear-gradient(135deg, #0a0e27 0%, #1a4d2e 50%, #0f3460 100%)',
    accentColor: '#00ff41',
    decorElements: `
      <div style="position: absolute; top: -50px; left: -50px; width: 300px; height: 300px; 
                  background: radial-gradient(circle, rgba(0,255,65,0.2) 0%, transparent 70%); 
                  filter: blur(40px);"></div>
      <div style="position: absolute; bottom: 100px; right: 50px; font-family: 'Courier New', monospace; 
                  font-size: 14px; color: #00ff41; opacity: 0.3; line-height: 1.4;">
        01001111 01110000<br/>01100101 01101110<br/>01000011 01101100
      </div>
    `
  },
  {
    id: 'polymarket',
    title: 'TRADING AGENT',
    subtitle: 'AI 預測市場交易員',
    tools: ['Polymarket CLOB', 'CoinGecko', 'Polygon', 'ethers.js'],
    gradient: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 50%, #2d5f7e 100%)',
    accentColor: '#ffd700',
    decorElements: `
      <div style="position: absolute; top: 80px; right: 60px; width: 200px; height: 120px;">
        <svg width="200" height="120" style="opacity: 0.3;">
          <polyline points="10,100 40,70 70,80 100,40 130,50 160,20 190,30" 
                    stroke="#ffd700" stroke-width="3" fill="none"/>
          <polyline points="10,110 40,95 70,100 100,75 130,80 160,60 190,65" 
                    stroke="#4a9eff" stroke-width="2" fill="none" opacity="0.6"/>
        </svg>
      </div>
      <div style="position: absolute; bottom: 120px; left: 50px; font-family: monospace; 
                  font-size: 18px; color: #ffd700; font-weight: bold;">
        +24.7%
      </div>
    `
  },
  {
    id: 'social',
    title: 'SOCIAL ENGINE',
    subtitle: '3 帳號 × 每週 20+ 篇',
    tools: ['Threads API', 'Instagram API', 'Puppeteer', 'PM2'],
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #5b2a86 50%, #c74b50 100%)',
    accentColor: '#ff6b9d',
    decorElements: `
      <div style="position: absolute; top: 60px; left: 60px; display: flex; gap: 20px;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,107,157,0.3); 
                    border: 3px solid #ff6b9d;"></div>
        <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(192,108,255,0.3); 
                    border: 3px solid #c06cff;"></div>
        <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(74,158,255,0.3); 
                    border: 3px solid #4a9eff;"></div>
      </div>
      <div style="position: absolute; bottom: 100px; right: 60px; width: 150px; height: 150px; 
                  background: radial-gradient(circle, rgba(255,107,157,0.4) 0%, transparent 70%); 
                  filter: blur(50px);"></div>
    `
  },
  {
    id: 'mrgeo',
    title: 'MRGEO.AI',
    subtitle: 'AI 搜尋品牌能見度顧問',
    tools: ['Astro', 'Tailwind', 'Cloudflare'],
    gradient: 'linear-gradient(135deg, #0f1419 0%, #1e3a5f 50%, #2c5282 100%)',
    accentColor: '#4a9eff',
    decorElements: `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  width: 400px; height: 400px; opacity: 0.15;">
        <svg width="400" height="400">
          <circle cx="200" cy="200" r="150" stroke="#4a9eff" stroke-width="2" fill="none"/>
          <circle cx="200" cy="200" r="100" stroke="#4a9eff" stroke-width="2" fill="none"/>
          <circle cx="200" cy="200" r="50" stroke="#4a9eff" stroke-width="3" fill="none"/>
        </svg>
      </div>
      <div style="position: absolute; bottom: 100px; left: 50px; font-family: monospace; 
                  font-size: 14px; color: #4a9eff; opacity: 0.5;">
        Generative Engine Optimization
      </div>
    `
  },
  {
    id: 'hellokids',
    title: 'HELLOKIDS',
    subtitle: '親子內容平台',
    tools: ['Laravel 11', 'Blade', 'Tailwind', 'Vite'],
    gradient: 'linear-gradient(135deg, #2d1b00 0%, #8b5a00 50%, #d4a574 100%)',
    accentColor: '#ffb347',
    decorElements: `
      <div style="position: absolute; top: 60px; right: 60px; width: 100px; height: 100px; 
                  border-radius: 50%; background: rgba(255,179,71,0.3); filter: blur(30px);"></div>
      <div style="position: absolute; bottom: 80px; left: 60px; width: 120px; height: 120px; 
                  border-radius: 50%; background: rgba(255,179,71,0.2); filter: blur(40px);"></div>
      <div style="position: absolute; top: 50%; right: 100px; transform: translateY(-50%); 
                  font-size: 120px; opacity: 0.1; color: #ffb347;">
        ♥
      </div>
    `
  },
  {
    id: 'tarot',
    title: 'AI TAROT',
    subtitle: 'AI 解牌 × 即時占卜',
    tools: ['Node.js', 'Claude API', 'LemonSqueezy', 'Cloudflare'],
    gradient: 'linear-gradient(135deg, #1a0033 0%, #4a148c 50%, #6a1b9a 100%)',
    accentColor: '#ffd700',
    decorElements: `
      <div style="position: absolute; top: 60px; left: 50%; transform: translateX(-50%); 
                  width: 120px; height: 180px; border: 3px solid #ffd700; border-radius: 8px; 
                  background: rgba(255,215,0,0.1); opacity: 0.5;"></div>
      <div style="position: absolute; top: 70px; left: 50%; transform: translateX(-30px); 
                  width: 120px; height: 180px; border: 3px solid #ffd700; border-radius: 8px; 
                  background: rgba(255,215,0,0.08); opacity: 0.4;"></div>
      <div style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); 
                  font-size: 40px; opacity: 0.3; color: #ffd700;">
        ✦ ✧ ✦
      </div>
    `
  },
  {
    id: 'dashboard',
    title: 'COMMAND CENTER',
    subtitle: '全系統視覺化控制台',
    tools: ['Express', 'Chart.js', 'PM2', 'Cloudflare Tunnel'],
    gradient: 'linear-gradient(135deg, #0d1b1e 0%, #1a3a3a 50%, #2d5a5a 100%)',
    accentColor: '#00ff00',
    decorElements: `
      <div style="position: absolute; top: 80px; left: 60px; font-family: monospace; 
                  font-size: 12px; color: #00ff00; line-height: 1.6; opacity: 0.5;">
        &gt; System Status: OPERATIONAL<br/>
        &gt; Uptime: 24/7<br/>
        &gt; Active Tasks: 47<br/>
        &gt; Memory: 72%
      </div>
      <div style="position: absolute; bottom: 80px; right: 60px; width: 200px; height: 100px;">
        <div style="display: flex; gap: 8px; align-items: flex-end; height: 100%;">
          <div style="width: 20px; height: 60%; background: #00ff00; opacity: 0.6;"></div>
          <div style="width: 20px; height: 80%; background: #00ff00; opacity: 0.6;"></div>
          <div style="width: 20px; height: 50%; background: #00ff00; opacity: 0.6;"></div>
          <div style="width: 20px; height: 90%; background: #00ff00; opacity: 0.6;"></div>
          <div style="width: 20px; height: 70%; background: #00ff00; opacity: 0.6;"></div>
        </div>
      </div>
    `
  },
  {
    id: 'virtual-idol',
    title: 'VIRTUAL IDOL',
    subtitle: 'AI 虛擬網紅 Pipeline',
    tools: ['ComfyUI', 'Stable Diffusion', 'Replicate'],
    gradient: 'linear-gradient(135deg, #0a0015 0%, #2d1b4e 50%, #5b2a86 100%)',
    accentColor: '#ff00ff',
    decorElements: `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  width: 200px; height: 250px; opacity: 0.3;">
        <div style="width: 100%; height: 100%; border: 3px solid #ff00ff; border-radius: 50%; 
                    background: radial-gradient(circle, rgba(255,0,255,0.2) 0%, transparent 70%);"></div>
        <div style="position: absolute; top: 30%; left: 35%; width: 15px; height: 15px; 
                    border-radius: 50%; background: #00ffff;"></div>
        <div style="position: absolute; top: 30%; right: 35%; width: 15px; height: 15px; 
                    border-radius: 50%; background: #00ffff;"></div>
        <div style="position: absolute; bottom: 40%; left: 50%; transform: translateX(-50%); 
                    width: 40px; height: 3px; background: #ff00ff;"></div>
      </div>
      <div style="position: absolute; top: 60px; right: 60px; font-family: monospace; 
                  font-size: 14px; color: #ff00ff; opacity: 0.4;">
        [ GENERATING... ]
      </div>
    `
  }
];

function generateHTML(poster) {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Noto+Sans+TC:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 800px;
      height: 450px;
      overflow: hidden;
      font-family: 'Inter', 'Noto Sans TC', sans-serif;
    }
    .poster {
      width: 100%;
      height: 100%;
      background: ${poster.gradient};
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px;
    }
    .title {
      font-size: 72px;
      font-weight: 900;
      color: #ffffff;
      text-align: center;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 40px ${poster.accentColor}50;
      letter-spacing: 2px;
      margin-bottom: 20px;
      z-index: 10;
    }
    .subtitle {
      font-size: 28px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      text-align: center;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      margin-bottom: 40px;
      z-index: 10;
    }
    .tools {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 700px;
      z-index: 10;
    }
    .tool-tag {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.2);
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="poster">
    ${poster.decorElements}
    <h1 class="title">${poster.title}</h1>
    <p class="subtitle">${poster.subtitle}</p>
    <div class="tools">
      ${poster.tools.map(tool => `<span class="tool-tag">${tool}</span>`).join('')}
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function generatePosters() {
  console.log('🎬 Starting poster generation...\n');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450, deviceScaleFactor: 2 });

  for (const poster of posters) {
    const html = generateHTML(poster);
    const outputPath = join(OUTPUT_DIR, `${poster.id}.png`);

    console.log(`📸 Generating ${poster.id}.png...`);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1500)); // 等字體加載
    await page.screenshot({ path: outputPath, type: 'png' });

    console.log(`✅ ${poster.id}.png saved`);
  }

  await browser.close();
  console.log('\n🎉 All posters generated successfully!');
}

generatePosters().catch(console.error);
