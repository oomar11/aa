"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { numericDisplayValue, parseNumericInput } from "@/lib/numeric-input";

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number;
  onChange: (value: number) => void;
  /** يعرض خانة فاضية بدل 0 أثناء الكتابة */
  blankZero?: boolean;
  /** القيمة الافتراضية لو المستخدم ساب الحقل فاضي */
  fallback?: number;
  round?: boolean;
};

/**
 * حقل رقم يسمح بمسح القيمة أثناء الكتابة — مش بيرجع 0 أو 1 فوراً.
 */
export function NumericInput({
  value,
  onChange,
  blankZero = true,
  fallback,
  min,
  max,
  step,
  round,
  className,
  onBlur,
  onFocus,
  ...rest
}: NumericInputProps) {
  const minNum = typeof min === "number" ? min : undefined;
  const maxNum = typeof max === "number" ? max : undefined;
  const resolvedFallback = fallback ?? minNum ?? 0;

  const [draft, setDraft] = useState(() =>
    numericDisplayValue(value, blankZero)
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(numericDisplayValue(value, blankZero));
    }
  }, [value, focused, blankZero]);

  function commit(raw: string) {
    const next = parseNumericInput(raw, resolvedFallback, {
      min: minNum,
      max: maxNum,
      round,
    });
    onChange(next);
    setDraft(numericDisplayValue(next, blankZero));
  }

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      step={step ?? (round ? 1 : "any")}
      value={draft}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        commit(e.target.value);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "") return;
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onChange(
          parseNumericInput(raw, resolvedFallback, {
            min: minNum,
            max: maxNum,
            round,
          })
        );
      }}
    />
  );
}
