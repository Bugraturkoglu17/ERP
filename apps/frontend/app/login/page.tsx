import { Suspense } from "react";

import LoginPage from "@/app/login/page";

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
