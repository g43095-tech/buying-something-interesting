# התקנה מאפס על חשבון חדש — המדריך המלא

> **עדכון:** ההתקנה כבר בוצעה בפועל. האחסון שנבחר הוא **GitHub Pages** (חינם, בלי חשבון Cloudflare) והאתר חי בכתובת <https://g43095-tech.github.io/buying-something-interesting/>. המדריך נשאר כאן כמסמך עזר מלא, וכל מקום שבו כתוב Cloudflare אפשר להחליף ב-GitHub Pages — הוא כבר מוגדר ועובד. מצב מדויק נמצא ב-[ACTIVATE.md](ACTIVATE.md).

**החשבון שכל השירותים ייפתחו עליו:** `g43095@gmail.com` (חשבון גוגל חדש — הבעלים).
**המנהל של החנות (הכניסה ל-`admin.html`):** `mytovmail@gmail.com`.

ההפרדה הזו מכוונת ונכונה: `g43095` הוא הבעלים של Supabase / GitHub / Cloudflare / AliExpress, ואילו `mytovmail` הוא רק **משתמש מנהל** בתוך מסד הנתונים של החנות. אין צורך לפתוח שום שירות עם `mytovmail` — רק שיהיה לך גישה לתיבת המייל שלו, כי לשם יגיעו הודעות אימות והזמנות.

> חשוב: כל הסיסמאות והמפתחות נשמרים אצלך (מנהל סיסמאות / GitHub Secrets / Cloudflare).
> **אל תשלח לי בצ'אט:** סיסמאות, `SUPABASE_SECRET_KEY`, `ALIEXPRESS_APP_SECRET`, `GEMINI_API_KEY`, טוקנים.

---

## 0. מה נפתח איפה — מבט על

| שירות | עם איזה חשבון | בשביל מה | חובה? |
|---|---|---|---|
| Google | `g43095` | הרשמה בשירותים האחרים וקבלת מייל | ✅ |
| Supabase | `g43095` | מסד נתונים, התחברות לקוחות, מועדפים, מוצרים | ✅ |
| GitHub | `g43095` | אחסון הקוד + האוטומציה (Actions) | ✅ |
| Cloudflare Pages | `g43095` | אחסון האתר עצמו (חינם, בלי כרטיס) | ✅ |
| AliExpress Portals | `g43095` | קישורי שותפים + App Key לשליפת מוצרים | ✅ (להכנסות) |
| Google AI Studio | `g43095` | מפתח Gemini לשכתוב מוצרים בעברית | ✅ (אחרת אין שכתוב) |
| Telegram | כל חשבון | התראה כשריצת האוטומציה נכשלת | רשות |
| Google Search Console | `g43095` | קידום האתר בגוגל | רשות |

זמן עבודה כולל: **כ-45 דקות**, ועוד המתנה של 1–3 ימי עסקים לאישור תוכנית השותפים של AliExpress.

---

## 1. חשבון גוגל (3 דקות)

1. צור את החשבון: <https://accounts.google.com/signup>
2. אחרי היצירה, הישאר מחובר ל-`g43095@gmail.com` — בכל ההרשמות בהמשך בחר **"Continue with Google"** ולא "Sign up with email", כדי שלא תצטרך סיסמה נוספת.
3. פתח את <https://mail.google.com> ובדוק שהתיבה נפתחת (לשם יגיעו מיילים מ-Supabase, GitHub ו-Cloudflare).

---

## 2. Supabase — מסד הנתונים (10 דקות)

### 2.1 פתיחת חשבון ופרויקט
1. היכנס ל-<https://supabase.com/dashboard/sign-up> ולחץ **Continue with Google** עם `g43095`.
2. **New project**:
   - **Name**: `shelf-shop` (או כל שם באנגלית)
   - **Database Password**: צור סיסמה חזקה ושמור אותה במנהל הסיסמאות. היא לא משמשת את האתר, אבל בלעדיה אי אפשר לשחזר גישה למסד.
   - **Region**: `Central EU (Frankfurt)` — הקרוב והמהיר לישראל.
   - **Plan**: Free. אין צורך בכרטיס אשראי.
3. המתן 1–2 דקות עד שהפרויקט מסיים להקים את עצמו.

### 2.2 יצירת הטבלאות
1. בתפריט הצד: **SQL Editor** → **New query**.
2. פתח במחשב את הקובץ `aliexpress_shop_schema.sql` (בתיקייה הראשית של הפרויקט), העתק את **כל** התוכן, הדבק ולחץ **Run**.
3. אמור להופיע `Success. No rows returned`. הקובץ בטוח להרצה חוזרת.
4. בצד שמאל → **Table Editor** → ודא שיש טבלאות: `admins`, `shop_products`, `shop_favorites`, `shop_preferences`, `shop_clicks`, `shop_searches`, `shop_approvals`.

### 2.3 הפיכת `mytovmail@gmail.com` למנהל
באותו **SQL Editor**, שאילתה חדשה:

```sql
INSERT INTO public.admins (email) VALUES ('mytovmail@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

לחץ **Run**. זה מה שמאפשר לכתובת הזו לראות את `admin.html` במקום מסך "אין הרשאה".

### 2.4 יצירת משתמש הכניסה למנהל
1. בתפריט: **Authentication** → **Users** → **Add user** → **Create new user**.
2. **Email**: `mytovmail@gmail.com`
3. **Password**: סיסמה חזקה — זו הסיסמה שאיתה תיכנס לפאנל הניהול. שמור אותה.
4. סמן **Auto Confirm User** (חשוב! אחרת החשבון יישאר "לא מאומת" והכניסה תיכשל).
5. **Create user**.

### 2.5 הגדרות התחברות (חשוב ללקוחות)
1. **Authentication** → **Sign In / Providers** → **Email**: ודא ש-*Enable Email provider* דלוק (ברירת מחדל).
2. **Confirm email**: מומלץ לכבות (`OFF`) בהתחלה. המייל המובנה של Supabase בחינם מוגבל לכמה הודעות בשעה, ולקוחות חדשים היו נתקעים בלי יכולת לאשר את החשבון. כשתכבו — הרשמה בחנות עובדת מיד.
3. **Authentication** → **URL Configuration**:
   - **Site URL**: הכתובת הסופית של האתר, למשל `https://g43095-tech.github.io/buying-something-interesting/` (אפשר לעדכן אחרי שלב 4).
   - **Redirect URLs**: הוסף `https://shelf-shop.pages.dev/**` וגם `http://localhost:5177/**` לבדיקות מקומיות.

### 2.6 איסוף שלושת הערכים — כאן טועים הכי הרבה
בתפריט **Project Settings**:

| מה | איפה בדיוק | איך נראה | רגיש? |
|---|---|---|---|
| **Project URL** | Project Settings → **Data API** (למעלה) | `https://abcdefghij.supabase.co` | לא |
| **Publishable / anon key** | Project Settings → **API Keys** → *Publishable key* (או ה-`anon` הישן) | `sb_publishable_...` / `eyJhbGci...` | לא — הוא גלוי בדפדפן ממילא |
| **Secret / service_role key** | Project Settings → **API Keys** → *Secret keys* (או `service_role` הישן) | `sb_secret_...` / `eyJhbGci...` | **כן, סודי לחלוטין** |

את ה-Secret אי אפשר לראות שוב אחרי היצירה — העתק אותו מיד למנהל הסיסמאות. הוא נדרש בשני מקומות בלבד: GitHub Secrets ו-Cloudflare (סעיפים 3 ו-4).

---

## 3. GitHub — הקוד והאוטומציה (10 דקות)

### 3.1 פתיחת חשבון
1. <https://github.com/signup> — אימייל `g43095@gmail.com`, סיסמה, שם משתמש באנגלית (למשל `g43095-shop`).
2. אשר את המייל ששלח GitHub.
3. **Settings → Emails**: ודא שהכתובת מסומנת כ-*Primary* ומאומתת, אחרת לא תקבל התראות על ריצות שנכשלו.

### 3.2 יצירת המאגר
1. <https://github.com/new>
2. **Repository name**: `buying-something-interesting` — **שם המאגר קובע את כתובת האתר**, ואסור שיכיל `ali` / `aliexpress` / `alibaba` / `taobao` (AliExpress פוסל כתובת כזו בטופס השותפים).
3. **Private** ✅ (חשוב — הקוד מכיל את כתובת הפרויקט)
4. **אל** תסמן README / .gitignore — המאגר צריך להיות ריק.
5. **Create repository**.

### 3.3 העלאת הקוד מהמחשב
הקוד כבר קיים אצלך בתיקייה הזו. יש שתי דרכים:

**אפשרות א' (מהירה) — אני דוחף:** שלח לי בצ'אט את שם המשתמש והמאגר (למשל `g43095-tech/buying-something-interesting`), ואני אחבר את Git בדרך של התחברות בדפדפן (`gh auth login --web`) ואדחוף. אין צורך לשלוח סיסמה.

**אפשרות ב' (עצמאית) — GitHub Desktop:** התקן מ-<https://desktop.github.com>, התחבר, **File → Add local repository** ובחר את התיקייה הזו, ואז **Publish repository** (בטל את הסימון על *Keep this code private* אם המאגר כבר נוצר).

### 3.4 הסודות (Secrets)
**Settings → Secrets and variables → Actions → New repository secret**. הוסף אחד-אחד:

| שם | הערך | חובה |
|---|---|---|
| `SUPABASE_SECRET_KEY` | ה-Secret key מסעיף 2.6 | ✅ |
| `ALIEXPRESS_APP_KEY` | מ-Portals, סעיף 5 | ✅ לשליפת מוצרים |
| `ALIEXPRESS_APP_SECRET` | מ-Portals, סעיף 5 | ✅ לשליפת מוצרים |
| `ALIEXPRESS_TRACKING_ID` | ה-Tracking ID שלך, סעיף 5 | ✅ |
| `GEMINI_API_KEY` | מ-Google AI Studio, סעיף 6 | ✅ לשכתוב AI |
| `TELEGRAM_BOT_TOKEN` | מסעיף 7 | רשות |
| `TELEGRAM_CHAT_ID` | מסעיף 7 | רשות |

### 3.5 המשתנה (Variable)
באותו מסך, לשונית **Variables** → **New repository variable**:
- `SHOP_SITE_URL` = `https://g43095-tech.github.io/buying-something-interesting/` (הכתובת מ-Cloudflare, סעיף 4). אפשר להוסיף אחרי הפרסום הראשון ואז להריץ את ה-Workflow שוב.

### 3.6 הפעלה ראשונה
**Actions** → **Auto AliExpress Shop** → **Run workflow** → **Run workflow**.
הריצה האוטומטית מוגדרת ל-4 פעמים ביום (09:00, 13:00, 17:00, 21:00 שעון ישראל).

---

## 4. Cloudflare Pages — האתר באוויר (10 דקות)

### 4.1 פתיחת חשבון
1. <https://dash.cloudflare.com/sign-up> — עם `g43095@gmail.com` וסיסמה (Cloudflare לא תומך בהתחברות גוגל ישירה).
2. אשר את המייל. **אין צורך להוסיף דומיין ואין צורך בכרטיס אשראי** — Pages עובד על תת-דומיין חינמי `*.pages.dev`.

### 4.2 חיבור המאגר
1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. אשר את הרשאת GitHub ובחר את המאגר שיצרת (`buying-something-interesting`).
3. **Begin setup** והגדר בדיוק:

| שדה | ערך |
|---|---|
| **Project name** | לא רלוונטי — ב-GitHub Pages הכתובת נקבעת לפי שם המאגר: `https://g43095-tech.github.io/buying-something-interesting/` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Root directory** | `aliexpress-store` |
| **Build command** | `node ../scripts/build_shop_pages.mjs` |
| **Build output directory** | `.` |

4. **Environment variables** (Production):
   - `SUPABASE_URL` = ה-Project URL מסעיף 2.6
   - `SUPABASE_SECRET_KEY` = ה-Secret key
   - `SHOP_SITE_URL` = `https://g43095-tech.github.io/buying-something-interesting/`
5. **Save and Deploy**. הבנייה הראשונה אורכת כ-1–2 דקות.

> אם הבנייה נכשלת בהודעה על `SUPABASE_SECRET_KEY` — חזור ל-*Settings → Environment variables* וודא שהשם מדויק (אותיות גדולות, קו תחתון) ושאין רווחים בערך.

### 4.3 אחרי הפרסום
1. פתח `https://g43095-tech.github.io/buying-something-interesting/` — אמורים להופיע מוצרים (בהתחלה ריק, עד שהאוטומציה תרוץ).
2. `https://shelf-shop.pages.dev/admin.html` — התחבר עם `mytovmail@gmail.com` והסיסמה מסעיף 2.4.
3. עדכן את `SHOP_SITE_URL` ב-GitHub (סעיף 3.5) והרץ את ה-Workflow שוב, כדי שה-sitemap והקישורים הקנוניים ייבנו נכון.

---

## 5. AliExpress — חשבון שותפים (15 דקות + המתנה לאישור)

### 5.1 חשבון AliExpress
1. צור חשבון רגיל (קונה) עם `g43095@gmail.com`: <https://login.aliexpress.com/join/register.htm>
2. אשר את המייל.

### 5.2 הצטרפות לתוכנית השותפים
1. היכנס ל-<https://portals.aliexpress.com/> ולחץ **Join now / Register** — מתחברים עם אותו חשבון AliExpress.
2. מלא: שם, מדינה (Israel), **איך תפרסם** → `Website`, כתובת האתר (`https://g43095-tech.github.io/buying-something-interesting/`), נושא האתר (Home & Kitchen / Gadgets).
3. שלח. האישור לוקח בדרך כלל **1–3 ימי עסקים**. בינתיים אפשר להמשיך לשאר השלבים.
4. אחרי האישור, ה-Tracking ID נמצא ב-**Account → Tracking ID** (למשל `shelfshop`). אם הוא לא `levtov`, עדכן את הסוד `ALIEXPRESS_TRACKING_ID` ב-GitHub.

### 5.3 מפתחות ה-API (App Key + App Secret)
1. ב-Portals: **Tools → API** (או ישירות <https://openservice.aliexpress.com/> עם אותה התחברות).
2. בקש הרשאת מפתח עבור **Affiliate API** (לפעמים נקרא *Dropshipping and Affiliate*).
3. צור אפליקציה (App) — יקבל **App Key** (מספר קצר) ו-**App Secret** (מחרוזת ארוכה).
4. העתק את שניהם ישירות ל-GitHub Secrets (סעיף 3.4). את ה-App Secret אין לשלוח באיזה שהוא צ'אט.

> האישור של ה-API יכול לקחת כמה ימים בנפרד מאישור השותפים. עד שהוא מגיע, האתר עובד אבל לא נכנסים מוצרים חדשים; אפשר בינתיים להוסיף מוצרים ידנית מהפאנל.

---

## 6. Google AI Studio — מפתח Gemini (2 דקות)

1. <https://aistudio.google.com/apikey> — מחובר עם `g43095`.
2. **Create API key** → בחר/צור פרויקט → **Create**.
3. העתק את המפתח (`AIza...`) ישירות ל-GitHub Secrets בשם `GEMINI_API_KEY`.
4. החינמי מספיק: האוטומציה כותבת כמה מוצרים ביום בלבד.

---

## 7. רשות — Telegram (התראות כשל)

1. פתח שיחה עם <https://t.me/BotFather> → `/newbot` → בחר שם → קבל **טוקן** (`123456:ABC...`).
2. שלח הודעה לבוט שלך, ואז פתח `https://api.telegram.org/bot<הטוקן>/getUpdates` ומצא `"chat":{"id":123456789`.
3. הוסף ב-GitHub: `TELEGRAM_BOT_TOKEN` ו-`TELEGRAM_CHAT_ID`.

---

## 8. רשות — Google Search Console (אחרי שהאתר באוויר)

1. <https://search.google.com/search-console> → **Add property** → **URL prefix** → `https://g43095-tech.github.io/buying-something-interesting/`.
2. **Sitemaps** → שלח `https://shelf-shop.pages.dev/sitemap.xml`.

---

## 9. מה צריך לעדכן בקוד (אני עושה — לא אתה)

במעבר לפרויקט Supabase חדש יש שני ערכים שמשתנים, והם מופיעים בקוד:

1. `aliexpress-store/config.js` — ה-Project URL וה-Publishable key (הציבוריים).
2. `.github/workflows/auto_aliexpress_shop.yml` — ה-`SUPABASE_URL` (3 מקומות) וה-`ALIEXPRESS_TRACKING_ID` (2 מקומות).

**מה לשלוח לי בסוף שלב 2:** את ה-Project URL ואת ה-Publishable key בלבד (שניהם ציבוריים ממילא), ואת ה-Tracking ID אחרי אישור AliExpress. אני אעדכן את הקבצים ואדחוף.

**מה לא לשלוח לי:** `SUPABASE_SECRET_KEY`, `ALIEXPRESS_APP_SECRET`, `GEMINI_API_KEY`, סיסמת מסד הנתונים, סיסמת המנהל. אלה נכנסים רק ל-GitHub Secrets ול-Cloudflare.

---

## 10. סדר מומלץ (כדי לא להיתקע)

```
1. חשבון גוגל g43095
2. Supabase: פרויקט → סכמה → admins → משתמש מנהל   (10 דק')
3. AliExpress Portals: הרשמה + בקשת API               (5 דק' ואז המתנה)
4. GitHub: חשבון → מאגר → דחיפת קוד → Secrets          (10 דק')
5. Google AI Studio: מפתח Gemini                       (2 דק')
6. Cloudflare Pages: חיבור → בנייה → פרסום             (10 דק')
7. הרצת Workflow ראשונה + כניסה ל-admin.html           (2 דק')
8. אחרי אישור AliExpress: עדכון Tracking ID/App keys והרצה חוזרת
```

---

## 11. תקלות נפוצות

| תסמין | סיבה | פתרון |
|---|---|---|
| `admin.html` מציג "אין הרשאה" | הכתובת לא בטבלת `admins`, או שהמשתמש לא אומת | הרץ שוב את ה-SQL של 2.3; ודא ש-*Auto Confirm User* היה מסומן |
| הכניסה נכשלת עם "Invalid login credentials" | סיסמה שגויה או משתמש לא נוצר | אפס סיסמה ב-Authentication → Users → המשתמש → *Reset password* |
| האתר מציג מוצרי דוגמה | אין חיבור ל-Supabase | בדוק `config.js` ושה-anon key שייך לאותו פרויקט |
| ה-Workflow "מדלג" על הריצה | `SUPABASE_SECRET_KEY` חסר | הוסף את הסוד והרץ ידנית |
| ה-Workflow נופל על AliExpress | אישור API טרם התקבל / מפתח שגוי | בדוק את הלוג; ודא Tracking ID תואם לחשבון |
| בנייה ב-Cloudflare נכשלת | Root directory / Build command שגויים | `aliexpress-store` ו-`node ../scripts/build_shop_pages.mjs` |
| דפי `/p/...` מחזירים 404 | לא הוגדר `SHOP_SITE_URL` לפני הבנייה | הוסף את המשתנה ובנה מחדש |
| Supabase מפסיק אחרי שבוע | פרויקט Free "נרדם" בחוסר פעילות | ה-Workflow רץ 4 פעמים ביום ומונע זאת; אם בכל זאת — Restore project מהדשבורד |

---

## 12. סיכום — שלוש שורות

1. כל השירותים נפתחים עם `g43095@gmail.com`; `mytovmail@gmail.com` הוא רק משתמש מנהל בתוך Supabase.
2. ארבעה סודות הולכים ל-GitHub (Supabase Secret, AliExpress Key+Secret, Gemini) ואחד נוסף ל-Cloudflare (Supabase Secret).
3. שלח לי רק את ה-Project URL, ה-Publishable key וה-Tracking ID — ואני מעדכן את הקוד ודוחף.
