/** شرح مختصر لهيكل قسم الخامات في الصفحة الرئيسية */
export function MaterialsHubIntro() {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5 text-right">
      <h2 className="text-sm font-bold text-foreground">إزاي تشتغل الخامات؟</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        كل قسم ليه أنظمة بتتحسب في التصميم.{" "}
        <span className="font-semibold text-foreground">القطاعات</span>: كل
        سيستم فيه قطاعاته وأسعار العود والتخصيم.{" "}
        <span className="font-semibold text-foreground">الاكسسوار</span>: براندات
        أسعار ثم أنظمة القواعد. باقي الأقسام (زجاج · سلك · حديد) أسعار مباشرة.
      </p>
    </section>
  );
}
