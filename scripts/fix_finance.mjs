import fs from 'fs';
const p = 'c:/Users/murat/golabs-web/apps/frontend/app/(dashboard)/finance/page.tsx';
let c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');
const newContent = lines.slice(0, 249).join('\n') + `
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header and Quick Stats */}
        <div className="corp-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Finansal Akış & İcmal Yönetimi</h2>
              <p className="text-slate-300 mt-1.5 text-xs max-w-xl">
                Projelerinizin hakediş (icmal) süreçlerini, şantiye giderlerini ve nakit akışını anlık takip edin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setIsInvoiceModalOpen(true)}
                className="corp-btn-primary"
              >
                <Plus className="w-4 h-4" /> Yeni Hakediş (İcmal) Ekle
              </button>
              <button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="corp-btn-secondary bg-slate-800 hover:bg-slate-700 text-white border-slate-700 active:bg-slate-900"
              >
                <Coins className="w-4 h-4 text-orange-400" /> Masraf Girişi Yap
              </button>
            </div>
          </div>
        </div>

        {/* Financial KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Hakediş Cirosu (Gelir)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">₺{totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                <ArrowUpRight className="w-3 h-3" /> Fatura Edilmiş
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Şantiye Giderleri (Maliyet)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">₺{totalExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                <ArrowDownRight className="w-3 h-3" /> Malzeme & İşçilik
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Net Kâr</p>
              <p className={\`text-xl font-bold mt-1 \${netEarnings >= 0 ? "text-slate-900" : "text-rose-600"}\`}>
                ₺{netEarnings.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold flex items-center mt-0.5">
                Tesisat Karlılığı
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ortalama Brüt Marj</p>
              <p className="text-xl font-bold text-slate-900 mt-1">%{marginPct.toFixed(1)}</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-indigo-600 h-full" 
                  style={{ width: \`\${Math.min(100, Math.max(0, marginPct))}%\` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector & Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar for Finance tabs */}
          <div className="lg:col-span-1 space-y-4">
            <div className="corp-card p-4 space-y-1">
              <button
                onClick={() => setActiveTab("invoices")}
                className={\`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 \${
                  activeTab === "invoices" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <Receipt className="w-4 h-4" /> Hakedişler & Faturalar
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={\`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 \${
                  activeTab === "expenses" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <Coins className="w-4 h-4" /> Şantiye Giderleri
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={\`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 \${
                  activeTab === "payments" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <CircleDollarSign className="w-4 h-4" /> Tahsilat & Ödeme Planı
              </button>
              <button
                onClick={() => setActiveTab("profitability")}
                className={\`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 \${
                  activeTab === "profitability" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <TrendingUp className="w-4 h-4" /> Proje Karlılık (İcmal)
              </button>
            </div>

            {/* Quick Cash-Flow Warning */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/70 text-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-wider text-amber-800">Vade & Finansal Akış Uyarısı</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                Gelecek 30 gün içerisinde tahsil edilecek 2 onaylı hakediş icmali bulunmaktadır. Taşeron ödemeleri ile eşleştirme yapılması önerilir.
              </p>
            </div>
          </div>

          {/* Tab Workspaces */}
          <div className="lg:col-span-3">
            {activeTab === "invoices" && (
              <FinanceInvoicesTab
                invoices={invoices}
                STATUS_LABELS={STATUS_LABELS}
                setPaymentForm={setPaymentForm}
                setIsPaymentModalOpen={setIsPaymentModalOpen}
              />
            )}

            {activeTab === "expenses" && (
              <FinanceExpensesTab
                expenses={expenses}
                CATEGORY_LABELS={CATEGORY_LABELS}
                setSelectedExpense={setSelectedExpense}
              />
            )}

            {activeTab === "payments" && (
              <FinancePaymentsTab
                payments={payments}
              />
            )}

            {activeTab === "profitability" && (
              <FinanceProfitabilityTab
                projects={projects}
                loadProfitability={loadProfitability}
                profitabilityData={profitabilityData}
              />
            )}
          </div>
        </div>

        <FinanceInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          customers={customers}
          projects={projects}
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
          handleInvoiceSubmit={handleInvoiceSubmit}
          invoiceSubtotal={invoiceSubtotal}
          invoiceTaxAmount={invoiceTaxAmount}
          invoiceGrandTotal={invoiceGrandTotal}
        />

        <FinanceExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          projects={projects}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          handleExpenseSubmit={handleExpenseSubmit}
        />

        <FinancePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
        />

        <FinanceExpenseDetailModal
          selectedExpense={selectedExpense}
          setSelectedExpense={setSelectedExpense}
          CATEGORY_LABELS={CATEGORY_LABELS}
          projects={projects}
          loadingStockMovement={loadingStockMovement}
          stockMovementDetails={stockMovementDetails}
        />
      </div>
    </DataState>
  );
}
`;
fs.writeFileSync(p, newContent);
