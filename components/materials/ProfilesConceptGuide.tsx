/** يوضح إن كل نظام فيه قطاعاته وأسعاره */
export function ProfilesConceptGuide() {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5 text-right">
      <h2 className="text-sm font-bold text-foreground">النظام = كل حاجة</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        كل سيستم فيه{" "}
        <span className="font-semibold text-foreground">قطاعاته</span> (العيدان)
        و<span className="font-semibold text-foreground">أسعارها</span> و
        <span className="font-semibold text-foreground">التخصيم</span> — من غير
        براندات منفصلة.
      </p>
      <p className="mt-2 rounded-lg bg-background/70 px-2.5 py-2 text-[10px] leading-relaxed text-muted">
        <span className="font-semibold text-foreground">مثال:</span> نظام «بريمير
        سيتي» فيه أسعار الحلق والضلفة والباكتة + معادلات التقطيع في مكان واحد.
      </p>
    </section>
  );
}
