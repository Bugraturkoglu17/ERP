"use client";

import { usePathname, useRouter } from "next/navigation";
import { Workflow, Layers, History, Play } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: "My Workflows", href: "/workflow", icon: Workflow },
    { name: "Templates Gallery", href: "/workflow/templates", icon: Layers },
  ];

  // We hide the tabs inside the designer canvas itself or specific run detail
  const isCanvasOrRun = pathname.includes("/runs/") || (pathname !== "/workflow" && pathname !== "/workflow/templates" && pathname !== "/workflow/new");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header / Tabs */}
      {!isCanvasOrRun && (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Workflow className="w-6 h-6 text-blue-600" />
                Workflow Studio
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Design and automate business processes with visual node-based workflows.
              </p>
            </div>
            {pathname === "/workflow" && (
              <button
                onClick={() => router.push("/workflow/new")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" />
                Create Workflow
              </button>
            )}
          </div>

          <div className="flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        {children}
      </div>
    </div>
  );
}
