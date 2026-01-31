# تشغيل مشروع خدمتي (Khidmati)

## 1. تثبيت PostgreSQL

### على Windows

1. **تحميل PostgreSQL**
   - ادخل إلى: https://www.postgresql.org/download/windows/
   - أو مباشرة: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - حمّل النسخة المناسبة (مثلاً 16 أو 17) وثبّت

2. **أثناء التثبيت**
   - احفظ كلمة مرور مستخدم `postgres` التي تضبطها
   - البورت الافتراضي: `5432` (اتركه كما هو إن لم تكن تعرف)

3. **التأكد من التشغيل**
   - من قائمة ابدأ: **pgAdmin** أو من CMD:
   ```cmd
   psql -U postgres -h localhost
   ```

### باستخدام Docker (اختياري)

```bash
docker run --name postgres-khidmati -e POSTGRES_PASSWORD=password -e POSTGRES_DB=khidmati -p 5432:5432 -d postgres:16
```

---

## 2. إنشاء قاعدة البيانات

### من سطر الأوامر (psql)

**على Windows (PowerShell)** — استخدم المسار الكامل (غيّر `18` إذا كان إصدارك مختلفاً):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE khidmati;"
```

**إذا كان psql مضافاً إلى PATH:**

```bash
# الدخول إلى PostgreSQL
psql -U postgres -h localhost

# إنشاء قاعدة بيانات
CREATE DATABASE khidmati;

# الخروج
\q
```

### من pgAdmin

- انقر يمين على **Databases** → **Create** → **Database**
- الاسم: `khidmati` ثم OK

---

## 3. إعداد ملف البيئة (.env)

1. انسخ الملف النموذجي:
   ```bash
   copy .env.example .env
   ```
   (أو انسخ محتوى `.env.example` يدوياً إلى ملف جديد اسمه `.env`)

2. عدّل `.env` وضع القيم الصحيحة:
   ```env
   DATABASE_URL=postgresql://postgres:كلمة_مرور_postgres@localhost:5432/khidmati
   SESSION_SECRET=أي_نص_سري_طويل_للسيشن
   ```

   استبدل `كلمة_مرور_postgres` بكلمة المرور التي اخترتها عند تثبيت PostgreSQL.

---

## 4. تثبيت الاعتماديات وتشغيل المشروع

```bash
npm install
```

### دفع الجداول إلى قاعدة البيانات (مرة واحدة أو بعد تغيير الـ schema)

**شغّل من مجلد المشروع (Khidmati):**

```powershell
cd C:\Users\Lenovo\Desktop\Khidmati
npm run db:push
```

يجب أن ترى: `[✓] Pulling schema from database...` ثم `[✓] Changes applied`.

### التحقق من الجداول في pgAdmin

1. افتح **pgAdmin** → **Servers** → **PostgreSQL** → **Databases** → **khidmati** (وليس `postgres`).
2. وسّع **khidmati** → **Schemas** → **public** → **Tables**.
3. انقر يمين على **Tables** → **Refresh**.
4. يفترض أن تظهر: **users**, **provider_profiles**, **reviews**, **conversations**, **messages**, **session**.

**عرض البيانات:** انقر يمين على أي جدول (مثلاً **users**) → **View/Edit Data** → **All Rows**.

**من Query Tool:** في pgAdmin افتح **Tools** → **Query Tool** واختر قاعدة **khidmati**، ثم نفّذ:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

ستظهر أسماء كل الجداول في المخطط public.

### تشغيل المشروع محلياً

**على Windows (CMD):**
```cmd
set NODE_ENV=development
npx tsx server/index.ts
```

**أو PowerShell:**
```powershell
$env:NODE_ENV="development"; npx tsx server/index.ts
```

**أو استخدم السكربت (إذا كان يعمل على نظامك):**
```bash
npm run dev
```

إذا ظهرت رسالة مثل `serving on port 5000` افتح المتصفح على: **http://localhost:5000**

---

## 5. رفع المشروع (النشر)

المشروع يستخدم Express + React. للرفع على **Vercel** تحتاج:

1. **قاعدة بيانات PostgreSQL في السحابة** (لأن Vercel لا يشغّل قاعدة بيانات):
   - **Neon** (مجاني): https://neon.tech → أنشئ مشروعاً واحصل على `DATABASE_URL`
   - **Supabase** (مجاني): https://supabase.com → أنشئ مشروعاً → Settings → Database → Connection string
   - **Railway** أو **Render** لـ PostgreSQL أيضاً

2. **رفع المشروع على Vercel**
   - ارفع الكود إلى GitHub ثم وصّل المستودع من لوحة Vercel
   - أو استخدم Vercel CLI:
     ```bash
     npm i -g vercel
     vercel
     ```

3. **إضافة المتغيرات في Vercel**
   - في المشروع على Vercel: **Settings** → **Environment Variables**
   - أضف:
     - `DATABASE_URL` = رابط PostgreSQL من Neon أو Supabase
     - `SESSION_SECRET` = نص سري قوي للإنتاج

4. **البناء والأوامر**
   - Build Command: `npm run build`
   - Output Directory: `dist/public` (أو حسب إعداد الـ build في مشروعك)
   - قد تحتاج تكوين `vercel.json` لتحويل الطلبات إلى السيرفر (API).

---

## ملخص سريع

| الخطوة | الأمر / الإجراء |
|--------|------------------|
| تثبيت PostgreSQL | من الموقع أو Docker |
| إنشاء DB | `CREATE DATABASE khidmati;` |
| إعداد .env | نسخ `.env.example` → `.env` وتعديل `DATABASE_URL` و `SESSION_SECRET` |
| الجداول | `npm run db:push` |
| تشغيل محلي | `npm run dev` أو `npx tsx server/index.ts` مع `NODE_ENV=development` |
| النشر | Vercel + Neon/Supabase وضبط المتغيرات |

إذا واجهت رسالة خطأ، تأكد من:
- أن خدمة PostgreSQL تعمل
- أن `DATABASE_URL` صحيح (اسم المستخدم، كلمة المرور، البورت، اسم قاعدة البيانات)
- تنفيذ `npm run db:push` مرة واحدة بعد ضبط `.env`
