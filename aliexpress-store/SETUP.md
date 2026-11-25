# הקמת החנות — חינם, בלי כרטיס אשראי

החנות יושבת בתיקייה הזו, בנפרד מאתר הערוץ. היא עובדת מול אותו פרויקט Supabase חינמי ומתפרסמת ב-Cloudflare Pages.

## 1. מסד נתונים (פעם אחת)
1. ב-Supabase → **SQL Editor** → **New query**, הדביקו והריצו את `aliexpress_shop_schema.sql` (בתיקיית הפרויקט הראשית). הקובץ בטוח להרצה חוזרת.
2. הוסיפו את עצמכם כמנהלים (באותו SQL Editor):
   ```sql
   INSERT INTO public.admins (email) VALUES ('your-email@gmail.com');
   ```
3. ב-**Authentication → Users → Add user** צרו משתמש עם אימייל וסיסמה לאותו אימייל. זה המשתמש שאיתו נכנסים ל-`admin.html`.

הסכמה כוללת: מוצרים, מועדפים, העדפות, לוג קליקים (`shop_clicks`), חיפושים ללא תוצאה (`shop_searches`) ולוג אישורים (`shop_approvals`).

## 2. חיבור האתר
הקובץ `config.js` כבר מצביע על פרויקט ה-Supabase של הפרויקט. אם החלפתם פרויקט — הדביקו שם את ה-Project URL וה-anon key.
כל עוד אין חיבור תקין, האתר מציג מוצרי דוגמה מתוך `assets/demo-products.json` כדי שאפשר לראות את הממשק.

## 3. דפי מוצר וקטגוריה (SEO ושיתוף)
החנות מייצרת דפים סטטיים אמיתיים:
- `/p/<id>/` — עמוד מוצר עם כותרת, תיאור, מחיר, „למה בחרנו”, מוצרים משלימים, Schema.org, Open Graph וכפתור שיתוף.
- `/c/<slug>/` — עמוד קטגוריה עם כל המוצרים שבה.

בנייה מקומית:
```bash
node scripts/build_shop_pages.mjs            # מהמאגר, עם SUPABASE_SECRET_KEY
node scripts/build_shop_pages.mjs --demo     # מוצרי הדגמה, בלי מסד
```
הפקודה יוצרת את התיקיות `p/` ו-`c/`, ואת `sitemap.xml` (אם הוגדר `SHOP_SITE_URL`) ואת `robots.txt`.
התיקיות שנוצרות אינן נכנסות ל-Git; הן נבנות מחדש בכל פריסה ובריצת ה-Action.

באתר עצמו לחיצה על כרטיס פותחת את חלון המוצר המהיר כמו קודם, אבל הכרטיס הוא קישור אמיתי — כך גוגל סורק את הדפים, וכל מוצר אפשר לשתף בכתובת קבועה.

## 4. העלאה לאוויר (Cloudflare Pages)
1. ב-Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**, בחרו את המאגר.
2. בהגדרות הפרויקט:
   - **Root directory** = `aliexpress-store`
   - **Build command** = `node ../scripts/build_shop_pages.mjs`
   - **Build output directory** = `.`
   - **Environment variables**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SHOP_SITE_URL` (הכתובת הסופית, למשל `https://shelf.pages.dev`).
3. אחרי הפריסה הוסיפו את הכתובת גם כמשתנה `SHOP_SITE_URL` ב-GitHub → **Settings → Variables** כדי שה-sitemap וה-canonical ייוצרו נכון.

## 5. אוטומציית המוצרים (GitHub Actions)
הוסיפו ב-**Settings → Secrets and variables → Actions**:
`SUPABASE_SECRET_KEY`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `GEMINI_API_KEY`.
אופציונלי להתראות כשל: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

הקובץ `.github/workflows/auto_aliexpress_shop.yml` רץ 4 פעמים ביום ומבצע:
- **שליפה** — מוצרים חדשים נכנסים לסטטוס „ממתין”, עם ציון איכות, כותרת/תיאור/„למה בחרנו” בעברית מ-Gemini ומזהה מעקב (`sub_id`) בקישור.
- **רענון** — בדיקת מחיר, דירוג, מלאי ותמונה של כל המוצרים המאושרים. מוצר שנעלם שלוש פעמים ברצף מועבר אוטומטית ל„הוסרו אוטומטית” ויורד מהאתר.
- **גיבוי** — ייצוא הקטלוג כקובץ JSON נשמר כארטיפקט ל-30 יום.
- **בנייה** — דפי המוצר והקטגוריות נבנים מחדש ונשמרים כארטיפקט `shop-site`.

לבדיקה ידנית: **Actions → Auto AliExpress Shop → Run workflow**.

## 6. תפעול יומיומי (`admin.html`)
- **ממתינים** — מסודרים לפי ציון (מכירות, דירוג, הנחה ועמלה). מוצר שדומה למוצר קיים מסומן „כפול?” עם שם המוצר המקורי.
- **מאושרים** — כולל קישור לדף הציבורי. **הוסרו אוטומטית** — מוצרים שהקישור/המלאי שלהם נגמר; אפשר לאשר מחדש.
- **עריכה** — כותרת, תיאור, „למה בחרנו”, קטגוריה, מחיר, תמונה וקישור. כפתור „שכתוב עם AI” זמין רק אם הופעלה פונקציית ה-Edge (סעיף 7).
- **נתונים ולוג** — המוצרים הנלחצים ביותר, חיפושים ללא תוצאה (מקור לרעיונות למוצרים הבאים) ולוג אישורים (מי אישר/דחה/מחק ומתי).

## 7. שכתוב AI מתוך הפאנל (אופציונלי)
הפונקציה `supabase/functions/ai-rewrite/index.ts` מאפשרת לכתוב מחדש כותרת/תיאור מתוך ממשק הניהול, בלי לחשוף מפתח בדפדפן.
```bash
supabase functions deploy ai-rewrite
supabase secrets set GEMINI_API_KEY=... SHOP_ORIGIN=https://your-shop.pages.dev
```
בלי הפעלה — הכפתור מציג הודעה ברורה והשאר ממשיך לעבוד כרגיל.

## 8. מדידת קליקים ועמלות
- בכל כרטיס ובכל כפתור רכישה נרשמת שורה ב-`shop_clicks` (מוצר, סוג, מקור). הנתונים מוצגים בפאנל.
- הקישור עצמו כולל `sub_id=<product_id>`. אם בפורטל השותפים שלכם פרמטר ה-Sub-ID נקרא אחרת, עדכנו אותו ב-`scripts/fetch_aliexpress_shop.mjs` (`withSubId`) ובבנייה (`withSubId` ב-`scripts/build_shop_pages.mjs`).

## 9. נגישות ופרטיות
- `accessibility.html` — הצהרת נגישות (ת״י 5568 / WCAG 2.0 AA), כולל רכז נגישות ודרכי פנייה.
- `privacy.html` — מדיניות פרטיות וגילוי שותפים.
- שני הקישורים מופיעים בתחתית החנות, בעמוד המוצר ובתפריט הצד.

## 10. הרצה מקומית
```bash
node scripts/build_shop_pages.mjs --demo
python -m http.server 5177
```
פתחו `http://127.0.0.1:5177/` לחנות ו-`/admin.html` לניהול (מצב הדגמה). `?demo=1` בפאנל עובד רק על localhost.

הכל בגרסאות החינמיות: Supabase Free, Cloudflare Pages Free ו-GitHub Actions. אין שרת שצריך להחזיק.
