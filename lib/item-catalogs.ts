export type DiscountId = "none" | "d1" | "d3" | "d5";
export type SystemId = "none" | "pvc1" | "pvc2" | "pvc3" | "sysA" | "sysB" | "sysC";
export type GlassId = "none" | "g464" | "g46464";

export const DISCOUNT_OPTIONS: { id: DiscountId; label: string; percent: number }[] = [
  { id: "none", label: "تجاهل", percent: 0 },
  { id: "d1", label: "خصم 1%", percent: 1 },
  { id: "d3", label: "خصم 3%", percent: 3 },
  { id: "d5", label: "خصم 5%", percent: 5 },
];

export const SYSTEM_OPTIONS: { id: SystemId; label: string }[] = [
  { id: "none", label: "تجاهل" },
  { id: "pvc1", label: "نظام PVC مخصص 1" },
  { id: "pvc2", label: "نظام PVC مخصص 2" },
  { id: "pvc3", label: "نظام PVC مخصص 3" },
  { id: "sysA", label: "نظام PVC A" },
  { id: "sysB", label: "نظام PVC B" },
  { id: "sysC", label: "نظام PVC C" },
];

export const GLASS_OPTIONS: { id: GlassId; label: string }[] = [
  { id: "none", label: "تجاهل" },
  { id: "g464", label: "زجاج عادي 4-6-4" },
  { id: "g46464", label: "زجاج عادي 4-6-4-6-4" },
];

export function discountPercent(id?: string | null): number {
  return DISCOUNT_OPTIONS.find((d) => d.id === id)?.percent ?? 0;
}
