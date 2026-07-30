# UPVC Design

تطبيق ويب عربي (RTL) لتصميم نوافذ وأبواب uPVC وحساب تكلفة الخامات — مبني على Next.js 16 و React 19.

## البدء السريع

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

## الأقسام الرئيسية

| القسم | المسار | الوصف |
|-------|--------|-------|
| التصميم | `/design` | عميل → مشروع → بنود → محرر رسم |
| الطلبات | `/orders` | تصفح العملاء والمشاريع |
| الخامات | `/materials` | قطاعات · اكسسوار · زجاج · سلك · حديد |

**دليل التنقل بالعربي:** [`docs/NAVIGATION-AR.md`](docs/NAVIGATION-AR.md)

## هيكل المشروع

```
app/           صفحات Next.js (App Router)
components/
  layout/      AppShell، Header، BottomNav
  design/      قائمة البنود والتمبلتات
  drawing/     محرر الرسم التفاعلي
  materials/   محررات الخامات
  customers/   العملاء والمشاريع
  orders/      متصفح الطلبات
  settings/    الثيم ووحدة القياس
lib/           منطق الأعمال (حسابات، تخطيط، تخزين)
```

## التخزين

البيانات تُحفظ في `localStorage` على الجهاز — لا يوجد سيرفر أو قاعدة بيانات. المفاتيح موحّدة في `lib/storage/keys.ts`.

## الأوامر

```bash
npm run dev      # تطوير
npm run build    # بناء إنتاج
npm run lint     # فحص الكود
```
