import axios from "axios";
import { buildApiUrl } from "@/lib/api";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

type LoginTarget = "platform" | "company";

const CREDENTIALS: Record<LoginTarget, { email: string; password: string }> = {
  platform: {
    email: process.env.NEXT_PUBLIC_DEMO_PLATFORM_EMAIL ?? "",
    password: process.env.NEXT_PUBLIC_DEMO_PLATFORM_PASSWORD ?? "",
  },
  // İleride firma demo hesabı eklendiğinde buraya eklenir
  company: {
    email: process.env.NEXT_PUBLIC_DEMO_PLATFORM_EMAIL ?? "",
    password: process.env.NEXT_PUBLIC_DEMO_PLATFORM_PASSWORD ?? "",
  },
};

export async function demoLogin(target: LoginTarget): Promise<{ ok: boolean; error?: string }> {
  const creds = CREDENTIALS[target];
  if (!creds.email || !creds.password) {
    return { ok: false, error: "Demo kimlik bilgileri tanımlanmamış." };
  }

  try {
    const params = new URLSearchParams();
    params.append("username", creds.email);
    params.append("password", creds.password);

    const res = await axios.post<{ access_token: string }>(
      buildApiUrl("/auth/login"),
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.data.access_token);
    }

    return { ok: true };
  } catch (err: any) {
    const detail = err.response?.data?.detail;
    const msg = typeof detail === "string" ? detail : "Giriş yapılamadı.";
    return { ok: false, error: msg };
  }
}
