# הפעלה — צ'ק־ליסט קצר

## מצב נוכחי (הוקם אוטומטית)

- **האתר באוויר:** <https://g43095-tech.github.io/AliExpress-website/>
- **פאנל ניהול:** <https://g43095-tech.github.io/AliExpress-website/admin.html> — כניסה עם `mytovmail@gmail.com` והסיסמה שנמסרה בנפרד.
- **Supabase:** פרויקט `louxyixmnftfqcfjkxsz` — הסכמה, ההרשאות, המנהל ומשתמש הכניסה כבר קיימים.
- **GitHub:** <https://github.com/g43095-tech/AliExpress-website> — הקוד, הסוד `SUPABASE_SECRET_KEY`, המשתנה `SHOP_SITE_URL` והפריסה האוטומטית (GitHub Pages) פעילים.
- **מה חסר כדי להתחיל לקבל מוצרים:** `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID` ו-`GEMINI_API_KEY` כסודות במאגר. בלי הם הריצה מדלגת על השליפה והאתר נבנה ריק אבל תקין.

> מתקין מאפס על חשבון חדש? עקוב אחרי **[NEW-ACCOUNT-SETUP.md](NEW-ACCOUNT-SETUP.md)** — הוא כולל את פתיחת כל החשבונות (Supabase, GitHub, Cloudflare, AliExpress, Gemini). הקישורים למטה מתייחסים לפרויקט Supabase הישן.

כל הסודות נשארים אצלך (GitHub / Supabase / Cloudflare). **אל תשלח לי מפתחות בצ'אט.**
מה שכן אפשר לשלוח: כתובת האתר אחרי הפרסום, או טקסט שגיאה מדויק.

## 1. מסד נתונים — חובה (2 דקות)
1. פתח את [SQL Editor של Supabase](https://supabase.com/dashboard/project/sqqghfcdgswvwvbiulwk/sql/new).
2. הדבק את כל התוכן של `aliexpress_shop_schema.sql` ולחץ **Run**. בטוח להריץ שוב.
3. ודא שיש משתמש התחברות לאימייל המנהל: [Authentication → Users](https://supabase.com/dashboard/project/sqqghfcdgswvwvbiulwk/auth/users) → **Add user** עם `gb7676g@gmail.com` וסיסמה.
   (האימייל כבר נמצא בטבלת `admins`.)

## 2. בדיקה מהירה — חובה
- פתח `admin.html` באתר, התחבר עם אותו אימייל וסיסמה.
- אמור להופיע מסך ניהול עם 5 טאבים (ממתינים / מאושרים / הוסרו / נדחו / נתונים ולוג) ולא מצב הדגמה.

## 3. אוטומציה — חובה
הסודות `SUPABASE_SECRET_KEY`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `GEMINI_API_KEY` כבר קיימים.
1. הרץ ידנית: [Auto AliExpress Shop → Run workflow](https://github.com/gb7676g-76/hamakom/actions/workflows/auto_aliexpress_shop.yml).
2. ודא שהריצה ירוקה ושב-`admin.html` מופיעים מוצרים ממתינים.
3. (לא חובה) הוסף [סודות GitHub](https://github.com/gb7676g-76/hamakom/settings/secrets/actions): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — לקבלת התראה על כשל. בוט: [@BotFather](https://t.me/BotFather).

## 4. פרסום — חובה
1. [Cloudflare → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create → Pages → Connect to Git** → בחר `gb7676g-76/hamakom`.
2. הגדרות:
   - **Root directory**: `aliexpress-store`
   - **Build command**: `node ../scripts/build_shop_pages.mjs`
   - **Build output directory**: `.`
   - **Environment variables**:
     - `SUPABASE_URL` = `https://sqqghfcdgswvwvbiulwk.supabase.co`
     - `SUPABASE_SECRET_KEY` = המפתח הסודי (אותו אחד מ-GitHub, מ-[API Keys](https://supabase.com/dashboard/project/sqqghfcdgswvwvbiulwk/settings/api-keys))
     - `SHOP_SITE_URL` = הכתובת שתקבל, למשל `https://shelf.pages.dev`
3. אחרי הפרסום הוסף את הכתובת גם כ-Variable ב-[GitHub Actions variables](https://github.com/gb7676g-76/hamakom/settings/variables/actions) בשם `SHOP_SITE_URL`, והרץ שוב את ה-Workflow כדי שה-sitemap וה-canonical ייווצרו.

## 5. אופציונלי — שכתוב AI מהפאנל
אם תרצה את הכפתור „שכתוב עם AI”:
```bash
supabase functions deploy ai-rewrite
supabase secrets set GEMINI_API_KEY=... SHOP_ORIGIN=https://shelf.pages.dev
```
דורש [Supabase CLI](https://supabase.com/docs/guides/cli) ומפתח Gemini מ-[Google AI Studio](https://aistudio.google.com/apikey).
בלי זה הכפתור מציג הודעה ברורה והשאר עובד רגיל.

## 6. אחרי שהאתר באוויר
- [Google Search Console](https://search.google.com/search-console) → הוסף את הדומיין → **Sitemaps** → שלח `https://<האתר>/sitemap.xml`.
- בדוק שדף מוצר נפתח ישירות (`/p/<id>/`) ושהוא משותף נכון בוואטסאפ.
- אשר מוצר אחד בפאנל, המתן לריצת הבנייה הבאה, ובדוק שהדף שלו נוצר.

## 7. מה להביא לי אם משהו לא עובד
- את כתובת האתר (ציבורית).
- את הודעת השגיאה המדויקת מהריצה ב-GitHub Actions, מהקונסול בדפדפן, או מצילום מסך.
- איזה שלב בצ'ק־ליסט נכשל.
לא לשלוח: מפתחות, סיסמאות, טוקנים.
