interface FinanceProfitabilityTabProps {
  projects: any[];
  loadProfitability: (projectId: string) => void;
  profitabilityData: any;
}

export function FinanceProfitabilityTab({
  projects,
  loadProfitability,
  profitabilityData
}: FinanceProfitabilityTabProps) {
  return (
    <div className="space-y-6">
      {/* Select Project for Profitability */}
      <div className="corp-card p-5 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Proje Bazlı Karlılık Analizi</h3>
        <div className="w-64">
          <select
            className="corp-select"
            onChange={(e) => loadProfitability(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Profitability Result */}
      {profitabilityData ? (
        <div className="corp-card p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kesilen Hakediş</p>
              <p className="text-lg font-bold text-slate-900 mt-1">₺{profitabilityData.revenue.toLocaleString("tr")}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harcanan Gider</p>
              <p className="text-lg font-bold text-rose-600 mt-1">₺{profitabilityData.cost.toLocaleString("tr")}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Kâr Miktarı</p>
              <p className={`text-lg font-bold mt-1 ${profitabilityData.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ₺{profitabilityData.net_profit.toLocaleString("tr")}
              </p>
            </div>
          </div>

          {/* Horizontal Bar visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase tracking-wider">
              <span>Proje Maliyet & Kar Oranı</span>
              <span className="text-indigo-600">Karlılık: %{profitabilityData.margin_pct.toFixed(0)}</span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex font-mono text-[10px] text-white font-bold shadow-inner border border-slate-200">
              {profitabilityData.revenue > 0 ? (
                <>
                  <div 
                    className="bg-rose-600 h-full flex items-center justify-center transition-all duration-300"
                    style={{ width: `${Math.max(5, (profitabilityData.cost / profitabilityData.revenue) * 100)}%` }}
                  >
                    MALİYET (%{((profitabilityData.cost / profitabilityData.revenue) * 100).toFixed(0)}%)
                  </div>
                  <div 
                    className="bg-emerald-600 h-full flex items-center justify-center transition-all duration-300 flex-1"
                  >
                    NET KÂR (%{profitabilityData.margin_pct.toFixed(0)}%)
                  </div>
                </>
              ) : (
                <div className="w-full text-slate-400 flex items-center justify-center italic">Bu projede henüz hakediş kaydı bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[250px] flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic">
          Karlılık verileri yüklenemedi.
        </div>
      )}
    </div>
  );
}
