export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  surface: {
    page:
      "bg-neu-bg text-neu-text",
    card:
      "neu-card",
    cardSoft:
      "neu-card-sm",
    modal:
      "neu-card",
  },
  text: {
    title: "text-neu-text font-semibold tracking-tight",
    subtitle: "text-neu-text-muted",
    label: "text-sm font-medium text-neu-text",
    helper: "text-xs text-neu-text-muted",
    danger: "text-sm text-neu-red",
  },
  input: {
    base:
      "neu-input",
    withIcon: "pl-11",
    withRightElement: "pr-11",
    error:
      "border-neu-red bg-red-50/50 focus:border-neu-red focus:ring-neu-red/20",
  },
  button: {
    base:
      "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neu-green disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none will-change-transform",
    size: {
      sm: "h-9 px-3.5",
      md: "h-11 px-4.5",
      lg: "h-12 px-6",
    },
    primary:
      "bg-[#e0e5ec] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] text-slate-600 hover:text-green-600 hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95",
    secondary:
      "bg-[#e0e5ec] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] text-slate-600 hover:text-slate-800 hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95",
    ghost:
      "bg-[#e0e5ec] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] text-slate-600 hover:text-slate-800 hover:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] hover:scale-[0.98] active:scale-95 w-11 h-11 rounded-full",
    danger:
      "bg-[#e0e5ec] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] text-slate-600 hover:text-red-500 hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95",
    outline:
      "bg-[#e0e5ec] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] text-slate-600 hover:text-slate-800 hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:scale-95",
  },
  table: {
    wrapper:
      "overflow-x-auto rounded-neu neu-card",
    table: "w-full min-w-[1000px] border-separate border-spacing-0",
    head:
      "sticky top-0 z-20 bg-neu-bg",
    headRow: "border-b border-neu-bg/50",
    th:
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neu-text-muted",
    tr:
      "border-b border-neu-bg/50 bg-neu-bg/30 transition-colors duration-300 hover:bg-neu-bg/50",
    td: "px-4 py-3 text-sm text-neu-text",
  },
};
