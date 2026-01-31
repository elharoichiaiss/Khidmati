# رفع المشروع على GitHub والنشر على Railway و Vercel

## 1. رفع المشروع على GitHub

### إنشاء مستودع جديد على GitHub

1. ادخل إلى **https://github.com** وسجّل الدخول.
2. انقر **+** (أعلى يمين) → **New repository**.
3. **Repository name:** مثلاً `khidmati`.
4. اختر **Public**.
5. **لا** تختر "Add a README" (المشروع موجود عندك محلياً).
6. انقر **Create repository**.

### رفع الكود من جهازك

افتح **PowerShell** أو **CMD** في مجلد المشروع (Khidmati) ونفّذ:

```powershell
cd C:\Users\Lenovo\Desktop\Khidmati

# تهيئة Git (مرة واحدة فقط)
git init

# إضافة كل الملفات (ملف .env مستثنى تلقائياً)
git add .

# أول commit
git commit -m "Initial commit: Khidmati project"

# ربط المشروع بمستودع GitHub (استبدل YOUR_USERNAME و YOUR_REPO باسمك واسم المستودع)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# رفع الفرع الرئيسي
git branch -M main
git push -u origin main
```

**مهم:** استبدل:
- `YOUR_USERNAME` → اسم مستخدمك في GitHub
- `YOUR_REPO` → اسم المستودع (مثلاً `khidmati`)

مثال: إذا كان المستخدم `ahmed` والمستودع `khidmati`:
```powershell
git remote add origin https://github.com/ahmed/khidmati.git
```

سيُطلب منك اسم المستخدم وكلمة مرور GitHub (أو **Personal Access Token** إذا كان الدخول بخطوتين مفعّل).

---

## 2. النشر على Railway

1. ادخل إلى **https://railway.app** وسجّل الدخول (يمكن عبر GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. اختر المستودع **khidmati** (أو اسم مستودعك).
4. Railway سيكتشف المشروع. اضبط الإعدادات:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Root Directory:** اتركه فارغاً (الجذر).
5. **Variables** (متغيرات البيئة):
   - `DATABASE_URL` = رابط PostgreSQL (من Railway: **New** → **Database** → **PostgreSQL** ثم انسخ `DATABASE_URL`).
   - `SESSION_SECRET` = أي نص سري طويل.
6. احفظ ثم انتظر انتهاء النشر. Railway سيعطيك رابطاً مثل `https://khidmati.up.railway.app`.

**قاعدة البيانات على Railway:** من المشروع → **New** → **Database** → **PostgreSQL** ثم انسخ `DATABASE_URL` إلى متغيرات المشروع، ثم شغّل `npm run db:push` محلياً مرة واحدة مع هذا الرابط (أو استخدم Railway CLI) لإنشاء الجداول.

---

## 3. النشر على Vercel

1. ادخل إلى **https://vercel.com** وسجّل الدخول (يمكن عبر GitHub).
2. **Add New** → **Project** → استيراد المستودع **khidmati**.
3. **Framework Preset:** اختر **Other** أو **Vite** إن ظهر.
4. **Build and Output Settings:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/public` (للـ frontend فقط؛ إذا كان المشروع full-stack قد تحتاج إعداد API أيضاً).
5. **Environment Variables:**
   - `DATABASE_URL` = رابط PostgreSQL (من Neon أو Supabase أو Railway).
   - `SESSION_SECRET` = أي نص سري طويل.
6. **Deploy**.

**ملاحظة:** Vercel مناسب جداً للـ frontend. إذا كان عندك **Express (API) في نفس المشروع**، تحتاج إما:
- فصل الـ API ونشره على **Railway** أو **Render**، والـ frontend على Vercel، أو
- استخدام **Vercel Serverless Functions** لتحويل الـ API إلى دوال (يتطلب تعديل في المشروع).

---

## ملخص الأوامر (رفع على GitHub فقط)

```powershell
cd C:\Users\Lenovo\Desktop\Khidmati
git init
git add .
git commit -m "Initial commit: Khidmati"
git remote add origin https://github.com/YOUR_USERNAME/khidmati.git
git branch -M main
git push -u origin main
```

بعد الرفع: وصّل المستودع من لوحة Railway أو Vercel كما في الخطوات أعلاه.
