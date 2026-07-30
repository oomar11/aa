/** شرح مختصر لهيكل قسم الخامات في الصفحة الرئيسية */
export function MaterialsHubIntro() {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5 text-right">
      <h2 className="text-sm font-bold text-foreground">إزاي تشتغل الخامات؟</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        كل قسم له دور في حساب تكلفة البند وقت التصميم.{" "}
        <span className="font-semibold text-foreground">القطاعات</span> و{" "}
        <span className="font-semibold text-foreground">الاكسسوار</span> بيتقسموا
        لخطوتين: <span className="text-foreground">براندات</span> (الأسعار) ثم{" "}
        <span className="text-foreground">أنظمة</span> (قواعد الحساب). باقي
        الأقسام (زجاج · سلك · حديد) أسعار مباشرة.
      </p>
    </section>
  );
}
