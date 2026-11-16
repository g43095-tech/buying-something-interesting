/**
 * סקריפט חינמי לשליחת מייל אוטומטי למנהל הערוץ בכל פעם שמצטברים 10 נרשמים חדשים לדיוור
 * להרצה ב-Google Apps Script (https://script.google.com) מחשבון Google של המנהל (gb7676g@gmail.com)
 * ללא צורך בשרת וללא כרטיס אשראי.
 */

const SUPABASE_URL = 'https://sqqghfcdgswvwvbiulwk.supabase.co';
// הדביקו כאן את ה-Secret key / service_role key מתוך Supabase -> Project Settings -> API Keys
// (מפתח זה נשמר רק בחשבון ה-Google הפרטי שלכם ולעולם לא נחשף באתר!)
const SUPABASE_SECRET_KEY = 'PASTE_YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY_HERE';
const ADMIN_EMAIL = 'gb7676g@gmail.com';
const BATCH_SIZE = 10;

function checkAndNotifyNewSubscribers() {
  if (!SUPABASE_SECRET_KEY || SUPABASE_SECRET_KEY.includes('PASTE_YOUR')) {
    throw new Error('יש להגדיר קודם את SUPABASE_SECRET_KEY בראש הסקריפט.');
  }

  const queryUrl =
    SUPABASE_URL +
    '/rest/v1/mailing_subscribers?accepted_mailing=eq.true&batch_notified=eq.false&order=consented_at.asc';

  const res = UrlFetchApp.fetch(queryUrl, {
    method: 'get',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: 'Bearer ' + SUPABASE_SECRET_KEY
    },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('שגיאה בקריאה מ-Supabase: ' + res.getContentText());
  }

  const subscribers = JSON.parse(res.getContentText());
  if (!Array.isArray(subscribers) || subscribers.length < BATCH_SIZE) {
    Logger.log('ממתינים להצטברות ' + BATCH_SIZE + ' נרשמים. כרגע ממתינים: ' + subscribers.length);
    return;
  }

  // שולחים מייל עבור כל קבוצה מלאה של 10 נרשמים חדשים
  for (let i = 0; i + BATCH_SIZE <= subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    const emails = batch.map(function (s) { return s.email; });
    const ids = batch.map(function (s) { return s.id; });

    const subject = 'ערוץ המקום: 10 נרשמים חדשים לדיוור מוכנים לצירוף לקבוצת Google';
    const body =
      'שלום מנהל הערוץ,\n\n' +
      'הצטברו ' + BATCH_SIZE + ' נרשמים חדשים שאישרו קבלת דיוור במייל.\n' +
      'העתק את השורה הבאה והדבק ישירות בהוספת חברים ב-Google Groups:\n\n' +
      emails.join(', ') +
      '\n\nפירוט:\n' +
      batch.map(function (s, idx) {
        return (idx + 1) + '. ' + s.email + ' (' + s.consented_at + ')';
      }).join('\n');

    MailApp.sendEmail(ADMIN_EMAIL, subject, body);

    // סימון הקבוצה ככזו שכבר נשלחה למנהל
    const patchUrl =
      SUPABASE_URL + '/rest/v1/mailing_subscribers?id=in.(' + ids.join(',') + ')';

    const patchRes = UrlFetchApp.fetch(patchUrl, {
      method: 'patch',
      contentType: 'application/json',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: 'Bearer ' + SUPABASE_SECRET_KEY,
        Prefer: 'return=minimal'
      },
      payload: JSON.stringify({ batch_notified: true }),
      muteHttpExceptions: true
    });

    if (patchRes.getResponseCode() >= 300) {
      throw new Error('שגיאה בעדכון batch_notified: ' + patchRes.getContentText());
    }
  }
}

/**
 * הריצו פונקציה זו פעם אחת בלבד מתוך עורך Apps Script
 * כדי להפעיל בדיקה אוטומטית כל שעה ברקע.
 */
function setupHourlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'checkAndNotifyNewSubscribers') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('checkAndNotifyNewSubscribers')
    .timeBased()
    .everyHours(1)
    .create();
}
