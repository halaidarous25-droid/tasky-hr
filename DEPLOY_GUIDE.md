# دليل النشر الكامل — Firebase Hosting + Firestore + Auth

## المتطلبات الأولية
- Node.js 18+
- Git
- حساب GitHub
- حساب Firebase (مجاني Spark plan يكفي)

---

## الخطوة 1: إنشاء مشروع Firebase

1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. اضغط **Add project** واختر اسماً (مثلاً: `hr-responsibilities`)

### تفعيل الخدمات المطلوبة:

#### Firebase Authentication
- **Build → Authentication → Get started**
- تبويب **Sign-in method** → فعّل **Email/Password**

#### Firestore Database
- **Build → Firestore Database → Create database**
- اختر **Production mode**
- اختر منطقة قريبة (مثلاً `asia-east1` للسعودية)

#### Firebase Hosting
- **Build → Hosting → Get started** (اكمل الخطوات الأساسية فقط)

---

## الخطوة 2: إعداد بيانات الاتصال

1. **Project Settings** ⚙️ → تبويب **Your apps** → **Add app** → Web
2. سجّل التطبيق وانسخ قيم `firebaseConfig`
3. ضع القيم في `app/.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

4. حدّث `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

---

## الخطوة 3: رفع المشروع على GitHub

```bash
cd "Kimi_Agent_إدارة المستخدمين"

git init
git add .
git commit -m "Initial commit: HR Responsibilities System with Firebase"

# أنشئ repo جديد على github.com ثم:
git remote add origin https://github.com/YOUR_USERNAME/hr-responsibilities.git
git branch -M main
git push -u origin main
```

---

## الخطوة 4: إعداد GitHub Secrets

**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | القيمة |
|---|---|
| `VITE_FIREBASE_API_KEY` | من firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | من firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | من firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | من firebase config |
| `VITE_FIREBASE_APP_ID` | من firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | JSON من Service Account (أدناه) |

### الحصول على FIREBASE_SERVICE_ACCOUNT:
- **Project Settings → Service accounts → Generate new private key**
- انسخ محتوى الملف JSON كاملاً وضعه كقيمة للـ Secret

---

## الخطوة 5: النشر اليدوي (أول مرة)

```bash
npm install -g firebase-tools
firebase login

cd app
npm install
npm run build
cd ..

firebase deploy --project YOUR_PROJECT_ID
```

**رابط الموقع:**
```
https://YOUR_PROJECT_ID.web.app
```

---

## الخطوة 6: التحقق من النشر

1. افتح `https://YOUR_PROJECT_ID.web.app`
2. جرّب تسجيل الدخول بـ `admin` / `123456`
3. تحقق من Firestore: **Firebase Console → Firestore** — ستجد collections مُنشأة تلقائياً

---

## الخطوة 7: النشر التلقائي (CI/CD)

بعد إعداد Secrets، كل push إلى `main` ينشر تلقائياً:
```bash
git add .
git commit -m "Update"
git push  # نشر تلقائي خلال ~2 دقيقة
```

---

## بيانات الدخول الافتراضية

| اسم المستخدم | كلمة المرور | الصلاحية |
|---|---|---|
| `admin` | `123456` | مدير النظام |
| `reviewer` | `123456` | مراجع |
| `sarah` | `123456` | أخصائي |
| `khaled` | `123456` | أخصائي |
| `noura` | `123456` | أخصائي |
| `viewer` | `123456` | مشاهد |

---

## هيكل قاعدة البيانات (Firestore)

```
/responsibilities/{id}   — بيانات المسؤوليات
/users/{id}              — بيانات المستخدمين
/settings/dropdown_lists — قوائم الخيارات
/audit_log/{auto-id}     — سجل التدقيق
```

---

## ملاحظات أمنية

- `app/.env` **لا يُرفع** إلى GitHub (محمي بـ `.gitignore`)
- بيانات Firebase Auth (كلمات المرور) محمية داخل Firebase فقط
- قواعد Firestore في `firestore.rules` تتطلب مصادقة لكل عملية
- لتغيير كلمة مرور مستخدم: **Firebase Console → Authentication → Users**
