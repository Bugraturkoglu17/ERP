"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [platformUser, setPlatformUser] = useState(false);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      router.replace("/login");
      return;
    }

    if (isPlatformAdmin(payload)) {
      setPlatformUser(true);
      router.replace("/platform");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[380px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (platformUser) {
    return null;
  }

  return <DashboardOverview />;
}
