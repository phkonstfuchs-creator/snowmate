"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

/* One bottom sheet: overlay, panel, exit motion, focus trap, Escape and
   scroll lock. New sheets use this instead of copying the markup.

   `children` may be a function to get `close`, e.g. to dismiss after a
   successful save. `canClose` runs before every close (overlay, Escape,
   the x button and `close`) and may cancel it. */
export default function Sheet({
  title,
  subtitle,
  onClose,
  canClose,
  className,
  style,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  canClose?: () => boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  useScrollLock();
  const t = useT();
  const titleId = useId();
  const { state, dismiss } = useSheetDismiss(onClose);
  const close = () => {
    if (canClose && !canClose()) return;
    dismiss();
  };
  const panelRef = useDialogFocus<HTMLDivElement>(close);

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={close} aria-hidden />
      <div
        ref={panelRef}
        className={className ? `sheet-panel ${className}` : "sheet-panel"}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={style}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="min-w-0">
            <h2 id={titleId} className="text-display-md">{title}</h2>
            {subtitle && <p className="truncate text-sm" style={{ color: "var(--ink-2)" }}>{subtitle}</p>}
          </div>
          <button type="button" onClick={close} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color="var(--ink-2)" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-6">{typeof children === "function" ? children(close) : children}</div>
      </div>
    </>
  );
}
