interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-[10px] p-[13px_16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.07em] mb-[5px]">
        {label}
      </div>
      <div
        className="font-serif tabnum text-lg font-semibold"
        style={{ color: color || undefined }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}
