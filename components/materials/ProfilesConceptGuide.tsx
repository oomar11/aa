/** يوضح الفرق بين البراند (أسعار) والنظام (تقطيع) */
export function ProfilesConceptGuide() {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5 text-right">
      <h2 className="text-sm font-bold text-foreground">الفرق بين البراند والنظام</h2>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-primary/30 bg-primary-soft/25 p-2.5">
          <p className="text-xs font-bold text-primary">البراند = الأسعار</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            كم سعر عود الحلق والضلفة والباكتة؟
            <br />
            مثال: <span className="text-foreground">سيتي</span>،{" "}
            <span className="text-foreground">بريمير</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-2.5">
          <p className="text-xs font-bold text-foreground">النظام = التقطيع</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            أي عيدان تستخدم؟ ومعادلات التخصيم إيه؟
            <br />
            مثال: <span className="text-foreground">مفصلي سيتي</span>،{" "}
            <span className="text-foreground">جرار بريمير</span>
          </p>
        </div>
      </div>
      <p className="mt-2.5 rounded-lg bg-background/70 px-2.5 py-2 text-[10px] leading-relaxed text-muted">
        <span className="font-semibold text-foreground">مثال عملي:</span> تعمل
        نظام اسمه «مفصلي سيتي» وتختارله براند «سيتي» — السعر يجي من البراند،
        والتقطيع يجي من النظام.
      </p>
    </section>
  );
}
