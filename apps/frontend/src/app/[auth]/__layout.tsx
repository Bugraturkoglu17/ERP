/**
 * apps/frontend/src/app/__layout.tsx
 * Route grupları (login, dashboard) için layout dosyası.
 * NOT: login grubu burada tanımlanır; dashboard kendi layout'unu alır.
 */

export default function AuthLayout({
  children,
}: {
  children:   React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-[420px]">
        {children}
      </div>
    </div>
  );
}
