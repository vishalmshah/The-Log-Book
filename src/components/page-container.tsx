interface Props {
  children: React.ReactNode;
  wide?: boolean;
}

export function PageContainer({ children, wide = false }: Props) {
  return (
    <div className={`mx-auto my-8 px-4 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <div
        className="rounded-[var(--radius-lg)] border p-6 shadow-lg"
        style={{
          background: "var(--bg-content)",
          borderColor: "var(--border-color)",
          boxShadow: "0 10px 40px -8px color-mix(in srgb, var(--brand) 20%, transparent)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
