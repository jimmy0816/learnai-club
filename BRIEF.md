# learnai.club — Jimmy 的 AI 實戰基地

## 定位
從成果展示到付費學習的一條龍。Jimmy 是 CTO，用 AI 打造個人作業系統，這是他做的東西。

## 目標受眾
- 想用 AI 做 side project 但不知從哪開始的人
- 有點技術底子、想提升 AI 工作流的人
- 想花錢學真實踩坑經驗、不想看 demo 課的人

## 網站結構（5 頁）

### 1. 首頁 (/)
- 一句話：「CTO，用 AI 打造個人作業系統，這是我做的東西」
- 不要像介紹頁，要像一個人在說話
- 展示精選 3-4 個作品卡片
- CTA 導向成果集和 Email 訂閱

### 2. 成果集 / Works (/works)
每個作品一張卡片：
- 做了什麼（一句話）
- 用了什麼工具
- 踩過什麼坑（最重要）
- 目前狀態（跑中 / 實驗中 / 上架中）

作品清單：
- OpenClaw 自動工作系統：AI 助理 24/7 自動執行任務、寫內容、管社群
- Polymarket 交易 Agent：AI 自動掃描 600+ 預測市場、下單、風控
- 3 個內容網站：mrgeo.ai (GEO 顧問)、hellokids.tw (親子)、氫水健康
- 多帳號社群自動化：Threads + IG 自動產文、審核、排程發布
- 虛擬明星流程：ComfyUI + AI 生成虛擬網紅
- Tarot App：AI 塔羅占卜 + LemonSqueezy 收費
- Web 管理面板：即時 Dashboard、基金面板、審核頁

### 3. Blog / 筆記 (/blog)
- 每篇 300-500 字，真實踩坑紀錄
- 帶 SEO（「OpenClaw 教學」「Claude API 費用」）
- 可以從 Session Harvest 抓內容

### 4. 開課 / 顧問 (/courses)
- 現在先放「我在規劃工作坊，有興趣留下 Email」的表單
- 不用等課程做好，先收名單
- 之後直接寄信通知

### 5. 關於 Jimmy (/about)
- 簡短，重點：做過什麼、現在在做什麼、為什麼值得信
- 不是履歷，是故事

## 技術規格
- **Framework**: Astro (SSG)
- **部署**: Cloudflare Pages
- **風格**: 深色主題，科技感但有人味，不要企業感
- **語言**: 繁體中文為主，關鍵技術詞用英文
- **RWD**: 手機優先
- **字型**: Inter + Noto Sans TC
- **色系**: 深黑底 + 電光藍點綴（類似 mrgeo.ai 的 #00D4FF）

## UI/UX
- 先架結構，UI 之後另外調整
- 內容先用 placeholder，之後替換
- Blog 用 Astro Content Collections（.mdx）
- 作品卡片用 data 驅動（JSON 或 frontmatter）
