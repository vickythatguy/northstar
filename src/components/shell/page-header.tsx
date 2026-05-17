export function PageHeader({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      {kicker && (
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
      )}
      <h1 className="text-4xl font-serif tracking-tight text-balance">{title}</h1>
      {children && <div className="mt-3 text-muted-foreground text-pretty">{children}</div>}
    </header>
  );
}
