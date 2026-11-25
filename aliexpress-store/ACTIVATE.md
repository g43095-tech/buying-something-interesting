# הפעלה — צ'ק־ליסט קצר

## מצב נוכחי (הוקם אוטומטית)

- **האתר באוויר:** <https://g43095-tech.github.io/buying-something-interesting/>
- **פאנל ניהול:** <https://g43095-tech.github.io/buying-something-interesting/admin.html> — כניסה עם `mytovmail@gmail.com` והסיסמה שנמסרה בנפרד.
- **שם החנות בממשק:** „המדף” (המותג מופיע רק בתוכן, לא בכתובת האתר).
- **Supabase:** פרויקט `louxyixmnftfqcfjkxsz` — הסכמה, ההרשאות, המנהל ומשתמש הכניסה כבר קיימים. ה-Site URL וה-Redirect URLs עודכנו לכתובת החדשה.
- **GitHub:** <https://github.com/g43095-tech/buying-something-interesting> — הקוד, הסוד `SUPABASE_SECRET_KEY`, המשתנה `SHOP_SITE_URL` והפריסה האוטומטית (GitHub Pages) פעילים.
- **הסודות מוגדרים:** `SUPABASE_SECRET_KEY`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID` (`levtov`), `GEMINI_API_KEY` — נבדקו מול AliExpress (`Call succeeds`) ומול Gemini (200).
- **סטטוס קטלוג:** הריצה הראשונה הכניסה 8 מוצרים עם כותרות ותיאורים בעברית שנכתבו ב-AI. מוצר אחד אושר לבדיקת פרסום, והיתר ממתינים לאישור שלך בפאנל.

> **חשוב — שם האתר מול AliExpress:** בטפסי תוכנית השותפים אסור שכתובת האתר תכיל שמות מותג של עליבאבא (`ali`, `aliexpress`, `alibaba`, `taobao`). לכן שם המאגר והכתובת הם `buying-something-interesting`. אם משנים שוב את שם המאגר — חייבים לעדכן באותו רגע גם את `SHOP_SITE_URL`, את ה-Site URL / Redirect URLs ב-Supabase, ואת הקישורים במסמכים.

> מתקין מאפס על חשבון חדש? עקוב אחרי **[NEW-ACCOUNT-SETUP.md](NEW-ACCOUNT-SETUP.md)** — הוא כולל את פתיחת כל החשבונות (Supabase, GitHub, AliExpress, Gemini).

כל הסודות נשארים אצלך (GitHub / Supabase). **אל תשלח לי מפתחות בצ'אט.**
מה שכן אפשר לשלוח: כתובת האתר אחרי הפרסום, או טקסט שגיאה מדויק.

## 1. מסד נתונים — כבר בוצע
1. הסכמה `aliexpress_shop_schema.sql` הורצה (7 טבלאות + הרשאות ל-`anon`/`authenticated`).
2. `mytovmail@gmail.com` נמצא בטבלת `admins` ויש לו משתמש Auth מאומת.
3. אם צריך להריץ שוב: [SQL Editor](https://supabase.com/dashboard/project/louxyixmnftfqcfjkxsz/sql/new) → הדבק את כל התוכן של `aliexpress_shop_schema.sql` → **Run**. בטוח להריץ שוב.

## 2. בדיקה מהירה — חובה
- בפאנל יש כפתור **„הוספת מוצר ידנית”** (כותרת, תיאור, מחיר, תמונה, קישור שותפים, קטגוריה). המוצר נכנס לממתינים, ואחרי אישור נבנה לו דף מוצר בריצת הבנייה הבאה.
- פתח `admin.html` באתר, התחבר עם אותו אימייל וסיסמה.
- אמור להופיע מסך ניהול עם 5 טאבים (ממתינים / מאושרים / הוסרו / נדחו / נתונים ולוג) ולא מצב הדגמה.

## 3. אוטומציה — מחכה למפתחות AliExpress ו-Gemini
1. הוסף סודות ב-[Settings → Secrets](https://github.com/g43095-tech/buying-something-interesting/settings/secrets/actions): `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID`, `GEMINI_API_KEY`.
2. הרץ ידנית: [Auto AliExpress Shop → Run workflow](https://github.com/g43095-tech/buying-something-interesting/actions/workflows/auto_aliexpress_shop.yml).
3. ודא שהריצה ירוקה ושב-`admin.html` מופיעים מוצרים ממתינים.
4. (לא חובה) הוסף `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — לקבלת התראה על כשל. בוט: [@BotFather](https://t.me/BotFather).

## 4. פרסום — כבר בוצע (GitHub Pages)
הפרסום אוטומטי בכל דחיפה ל-`main` (Workflow `auto_aliexpress_shop.yml`). אין צורך ב-Cloudflare ואין כרטיס אשראי.
הכתובת נקבעת לפי שם המאגר: `https://g43095-tech.github.io/<repo-name>/` — ולכן כל הקישורים באתר יחסיים.

## 5. אופציונלי — שכתוב AI מהפאנל
אם תרצה את הכפתור „שכתוב עם AI”:
```bash
supabase functions deploy ai-rewrite
supabase secrets set GEMINI_API_KEY=... SHOP_ORIGIN=https://g43095-tech.github.io/buying-something-interesting
```
דורש [Supabase CLI](https://supabase.com/docs/guides/cli) ומפתח Gemini מ-[Google AI Studio](https://aistudio.google.com/apikey).
בלי זה הכפתור מציג הודעה ברורה והשאר עובד רגיל.

## 6. אחרי שהאתר באוויר
- [Google Search Console](https://search.google.com/search-console) → הוסף את הדומיין → **Sitemaps** → שלח `https://g43095-tech.github.io/buying-something-interesting/sitemap.xml`.
- בדוק שדף מוצר נפתח ישירות (`/p/<id>/`) ושהוא משותף נכון בוואטסאפ.
- אשר מוצר אחד בפאנל, המתן לריצת הבנייה הבאה, ובדוק שהדף שלו נוצר.

## 7. מה להביא לי אם משהו לא עובד
- את כתובת האתר (ציבורית).
- את הודעת השגיאה המדויקת מהריצה ב-GitHub Actions, מהקונסול בדפדפן, או מצילום מסך.
- איזה שלב בצ'ק־ליסט נכשל.
לא לשלוח: מפתחות, סיסמאות, טוקנים.
