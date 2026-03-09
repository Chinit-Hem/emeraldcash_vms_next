export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  surface: {
    page:
      "bg-[var(--bg-primary)] text-[var(--text-primary)]",
    card:
      "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-soft backdrop-blur-xl",
    cardSoft:
      "rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-soft)] shadow-soft backdrop-blur-lg",
    modal:
      "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-elevated backdrop-blur-2xl",
  },
  text: {
    title: "text-[var(--text-primary)] font-semibold tracking-tight",
    subtitle: "text-[var(--text-secondary)]",
    label: "text-sm font-medium text-[var(--text-primary)]",
    helper: "text-xs text-[var(--text-secondary)]",
    danger: "text-sm text-[var(--accent-red-strong)]",
  },
  input: {
    base:
      "h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-[var(--text-primary)] transition-all duration-300 ease-in-out placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-green)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-green-soft)] disabled:cursor-not-allowed disabled:opacity-60",
    withIcon: "pl-11",
    withRightElement: "pr-11",
    error:
      "border-[var(--accent-red)] bg-[var(--accent-red-soft)] focus:border-[var(--accent-red)] focus:ring-[var(--accent-red-soft)]",
  },
  button: {
    base:
      "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-transform transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none active:scale-[0.96] will-change-transform",
    size: {
      sm: "h-9 px-3.5",
      md: "h-11 px-4.5",
      lg: "h-12 px-6",
    },
    primary:
      "border border-[var(--accent-green)] bg-[var(--accent-green)] text-white shadow-glow-green hover:bg-[var(--accent-green-hover)] hover:border-[var(--accent-green-hover)] active:bg-[var(--accent-green-active)] active:border-[var(--accent-green-active)]",
    secondary:
      "border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)] hover:border-[var(--glass-border-strong)] active:bg-[var(--glass-bg-soft)]",
    ghost:
      "bg-transparent text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)]",
    danger:
      "border border-[var(--accent-red)] bg-[var(--accent-red)] text-white shadow-glow-red hover:bg-[var(--accent-red-hover)] hover:border-[var(--accent-red-hover)] active:bg-[var(--accent-red-active)] active:border-[var(--accent-red-active)]",
    outline:
      "border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)]",
  },
  table: {
    wrapper:
      "overflow-x-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--table-bg-strong)] shadow-soft backdrop-blur-2xl",
    table: "w-full min-w-[1000px] border-separate border-spacing-0",
    head:
      "sticky top-0 z-20 bg-[var(--table-head-bg-strong)]",
    headRow: "border-b border-[var(--glass-border)]",
    th:
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]",
    tr:
      "border-b border-[var(--glass-border)] bg-[var(--table-row-bg)] transition-colors duration-300 hover:bg-[var(--table-row-hover)]",
    td: "px-4 py-3 text-sm text-[var(--text-primary)]",
  },
};
