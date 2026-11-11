# AR Studio 設定指引(約 10 分鐘)

## 1. 建立 Supabase 專案
1. 到 https://supabase.com 免費註冊,按 New project(地區揀 Singapore)。

## 2. 建立管理員帳號
1. 左邊 Authentication → Users → Add user → Create new user。
2. 輸入你的電郵和密碼,勾選 Auto Confirm User。
3. Authentication → Sign In / Providers → 關閉 "Allow new users to sign up"(重要,避免別人自行註冊)。

## 3. 建立儲存空間
1. Storage → New bucket,名稱 `models`,打開 **Public bucket**。
2. 左邊 SQL Editor → 貼上以下指令 → Run(只允許已登入的你上載、修改、刪除):
```sql
create policy "admin all" on storage.objects
for all to authenticated
using (bucket_id = 'models') with check (bucket_id = 'models');
```

## 4. 填寫 config.js
Project Settings → API(或 Data API)複製:
- Project URL → `SUPABASE_URL`
- anon public key → `SUPABASE_KEY`
(anon key 本身係公開用途,安全由上面的規則保護。)

## 5. 上載到 GitHub Pages
1. 把 `ar-site` 內全部 6 個檔案(index.html、admin.html、view.html、config.js、style.css、SETUP.md)一次拖入 GitHub repo。
2. Settings → Pages → Branch 揀 main / root → Save。
3. 打開 `https://你的帳號.github.io/repo名/` 就是登入頁。

## 使用
登入 → 上載 GLB → 調整 → 儲存並生成 QR。之後可在「已上載的模型」重新編輯,QR 不變,效果自動更新。
