"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface MetaData {
  status: string;
  summary: {
    total_domains: number;
    total_entities: number;
    total_routes: number;
    total_public_endpoints: number;
  };
  domains: Array<{
    name: string;
    description: string;
    tenant_protection: boolean;
    public_endpoints_count: number;
  }>;
  events: Array<{
    name: string;
    producer: string;
    consumers: string[];
    description: string;
  }>;
  tasks: Array<{
    name: string;
    producer: string;
    queue: string;
    retry_policy: string;
    idempotency_key: string;
  }>;
}

export default function SystemModulesPage() {
  const router = useRouter();
  const [data, setData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (!isPlatformAdmin(payload)) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        setData(await apiGet<MetaData>("/meta/dashboard"));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) return <div className="p-8">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-red-500">Hata: {error}</div>;
  if (!data) return <div className="p-8">Veri bulunamadı.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Sistem Modülleri ve Sağlık Durumu</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">API Status:</span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold uppercase">
            {data.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded border shadow-sm">
          <div className="text-sm text-gray-500">Total Domains</div>
          <div className="text-2xl font-bold">{data.summary.total_domains}</div>
        </div>
        <div className="bg-white p-4 rounded border shadow-sm">
          <div className="text-sm text-gray-500">Total Entities</div>
          <div className="text-2xl font-bold">{data.summary.total_entities}</div>
        </div>
        <div className="bg-white p-4 rounded border shadow-sm">
          <div className="text-sm text-gray-500">Total Routes</div>
          <div className="text-2xl font-bold">{data.summary.total_routes}</div>
        </div>
        <div className="bg-white p-4 rounded border shadow-sm">
          <div className="text-sm text-gray-500">Public Endpoints</div>
          <div className="text-2xl font-bold">{data.summary.total_public_endpoints}</div>
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-white rounded border shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold">Domain Registry</h2>
        </div>
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Tenant Protection</th>
              <th className="px-4 py-3 text-center">Public Endpoints</th>
            </tr>
          </thead>
          <tbody>
            {data.domains.map((d) => (
              <tr key={d.name} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-3 text-gray-500">{d.description}</td>
                <td className="px-4 py-3 text-center">
                  {d.tenant_protection ? (
                    <span className="text-green-600">✓ Yes</span>
                  ) : (
                    <span className="text-red-600">✗ No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{d.public_endpoints_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Events and Tasks (Side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Events Table */}
        <div className="bg-white rounded border shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="font-semibold">Event Bus Registry</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">Producer</th>
                  <th className="px-4 py-3">Consumers</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.name} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="px-4 py-3 text-gray-500">{e.producer}</td>
                    <td className="px-4 py-3 text-gray-500">{e.consumers.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded border shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="font-semibold">Background Task Registry</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Task Name</th>
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3">Idempotency</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((t) => (
                  <tr key={t.name} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.queue}</td>
                    <td className="px-4 py-3 text-gray-500">{t.idempotency_key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
