"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { 
  FileText, 
  Upload, 
  Download, 
  X, 
  Plus, 
  FileUp, 
  Trash2, 
  Search, 
  Eye, 
  Folder, 
  History, 
  Layers,
  ChevronRight,
  Maximize2,
  FileCheck
} from "lucide-react";

export default function DocumentsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  
  // AutoCAD Preview simulation state
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewZoom, setPreviewZoom] = useState(100);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    doc_type: "drawing_hvac",
    revision_note: "",
    file: null as File | null,
  });

  // Version Upload Modal State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<any>(null);
  const [versionForm, setVersionForm] = useState({
    revision_note: "",
    file: null as File | null,
  });

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const projs = await apiGet("/projects");
        setProjects(Array.isArray(projs) ? projs : []);
        if (Array.isArray(projs) && projs.length > 0) {
          handleSelectProject(projs[0]);
        }
      } catch (err) {
        console.error("Projects load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  async function handleSelectProject(proj: any) {
    setSelectedProject(proj);
    setDocsLoading(true);
    setPreviewDoc(null); // Reset preview
    try {
      const docs = await apiGet(`/documents/project/${proj.id}`);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("Documents fetch error:", err);
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadForm.file || !selectedProject) return;

    try {
      const formData = new FormData();
      formData.append("project_id", selectedProject.id);
      formData.append("doc_type", uploadForm.doc_type);
      formData.append("revision_note", uploadForm.revision_note);
      formData.append("file", uploadForm.file);

      await apiPost("/documents/upload", formData, true);
      alert("Döküman başarıyla yüklendi.");
      setIsUploadModalOpen(false);
      setUploadForm({ doc_type: "drawing_hvac", revision_note: "", file: null });
      handleSelectProject(selectedProject);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Yükleme işlemi başarısız oldu.");
    }
  }

  async function handleVersionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!versionForm.file || !selectedDocForVersion) return;

    try {
      const formData = new FormData();
      formData.append("revision_note", versionForm.revision_note);
      formData.append("file", versionForm.file);

      await apiPost(`/documents/${selectedDocForVersion.id}/version`, formData, true);
      alert("Yeni versiyon başarıyla yüklendi.");
      setIsVersionModalOpen(false);
      setVersionForm({ revision_note: "", file: null });
      setSelectedDocForVersion(null);
      handleSelectProject(selectedProject);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Versiyon yükleme işlemi başarısız oldu.");
    }
  }

  async function handleDownload(docId: string) {
    try {
      const res = await apiGet<{ url?: string }>(`/documents/${docId}/download`);
      const downloadUrl = typeof res?.url === "string" ? res.url : "";
      if (!downloadUrl) {
        throw new Error("İndirme bağlantısı alınamadı.");
      }
      window.open(downloadUrl, "_blank");
    } catch (err: any) {
      alert(err.response?.data?.detail || "İndirme linki oluşturulamadı.");
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Bu dökümanı arşive kaldırmak istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/documents/${docId}`);
      alert("Döküman arşivlendi.");
      handleSelectProject(selectedProject);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Silme işlemi başarısız oldu.");
    }
  }

  const DOC_TYPES_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    contract: { label: "Sözleşme", color: "text-emerald-700 border-emerald-200", bg: "bg-emerald-50" },
    drawing_hvac: { label: "Havalandırma (HVAC) Çizimi", color: "text-blue-700 border-blue-200", bg: "bg-blue-50" },
    drawing_fire: { label: "Yangın Söndürme Çizimi", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" },
    drawing_seismic: { label: "Sismik Koruma Çizimi", color: "text-amber-700 border-amber-200", bg: "bg-amber-50" },
    drawing_mep: { label: "MEP Koordinasyon Çizimi", color: "text-indigo-700 border-indigo-200", bg: "bg-indigo-50" },
    invoice_doc: { label: "Hakediş Fişi/Belgesi", color: "text-purple-700 border-purple-200", bg: "bg-purple-50" },
    field_report: { label: "Saha Günlük Raporu", color: "text-teal-700 border-teal-200", bg: "bg-teal-50" },
    other: { label: "Diğer Teknik Belge", color: "text-slate-700 border-slate-200", bg: "bg-slate-50" }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.revision_note && doc.revision_note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedTypeFilter === "all" || doc.doc_type === selectedTypeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Projeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 shadow-lg text-white">
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight">Doküman & AutoCAD Çizim Havuzu</h2>
          <p className="text-slate-300 mt-2 text-sm max-w-2xl">
            Sismik Koruma, HVAC ve Yangın Tesisat şantiye çizimlerini, revizyon geçmişlerini ve hakediş belgelerini bulut altyapısında güvenle yönetin.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-60"></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Project Selector Panel */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-500" /> Şantiye Projeleri
            </h3>
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleSelectProject(proj)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${
                    selectedProject?.id === proj.id 
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50/50 shadow-sm ring-1 ring-blue-500" 
                      : "border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="font-semibold text-slate-900 text-sm line-clamp-1">{proj.name}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${selectedProject?.id === proj.id ? "rotate-90 text-blue-500" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">
                      {proj.project_no || "PROJE-NO"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {proj.due_date ? new Date(proj.due_date).toLocaleDateString("tr") : "Tarih Belirtilmemiş"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Workspace */}
        <div className="xl:col-span-3 space-y-6">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Toolbar & Filter */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Search */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Çizim veya doküman ara..." 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Tabs */}
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="p-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="all">Tüm Dosya Tipleri</option>
                    <option value="contract">Sözleşmeler</option>
                    <option value="drawing_hvac">HVAC Çizimleri</option>
                    <option value="drawing_fire">Yangın Çizimleri</option>
                    <option value="drawing_seismic">Sismik Çizimler</option>
                    <option value="drawing_mep">MEP Çizimleri</option>
                    <option value="invoice_doc">Hakediş Dosyaları</option>
                    <option value="field_report">Saha Raporları</option>
                    <option value="other">Diğerleri</option>
                  </select>
                </div>

                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4" /> Yeni Dosya Yükle
                </button>
              </div>

              {/* AutoCAD Live Vector Previewer Module */}
              {previewDoc && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">{previewDoc.original_name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">AutoCAD Vector Live View (Simüle Edilmiş)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                        <button onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))} className="px-2 py-1 text-slate-400 hover:text-white text-xs font-semibold">-</button>
                        <span className="px-2 text-xs font-mono text-slate-300">{previewZoom}%</span>
                        <button onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} className="px-2 py-1 text-slate-400 hover:text-white text-xs font-semibold">+</button>
                      </div>
                      <button onClick={() => setPreviewDoc(null)} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative h-[320px] bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
                    {/* CAD Grid Map Drawing simulation */}
                    <div 
                      className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"
                      style={{ transform: `scale(${previewZoom / 100})` }}
                    ></div>
                    
                    {/* AutoCAD mock elements */}
                    <div 
                      className="w-[80%] h-[75%] border border-cyan-500/30 rounded relative flex items-center justify-center transition-all duration-300"
                      style={{ transform: `scale(${previewZoom / 100})` }}
                    >
                      <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400">LAYER: HVAC_VENTILATION_PIPE_01</span>
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono text-emerald-400">SCALE: 1/50 METRIC</span>
                      <div className="w-[85%] h-[85%] flex items-center justify-center">
                        <svg className="w-full h-full text-slate-700" viewBox="0 0 400 200">
                          {/* Main grid line simulation */}
                          <line x1="50" y1="30" x2="350" y2="30" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="3" strokeDasharray="5,5" />
                          <line x1="50" y1="170" x2="350" y2="170" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="3" strokeDasharray="5,5" />
                          {/* Mechanical circular elements */}
                          <circle cx="100" cy="100" r="35" fill="none" stroke="rgba(244, 63, 94, 0.6)" strokeWidth="2" />
                          <circle cx="200" cy="100" r="25" fill="none" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="2" />
                          <circle cx="300" cy="100" r="35" fill="none" stroke="rgba(244, 63, 94, 0.6)" strokeWidth="2" />
                          {/* Piping connectors */}
                          <path d="M 135 100 L 175 100" fill="none" stroke="rgba(251, 191, 36, 0.6)" strokeWidth="3" />
                          <path d="M 225 100 L 265 100" fill="none" stroke="rgba(251, 191, 36, 0.6)" strokeWidth="3" />
                          <text x="200" y="105" textAnchor="middle" fill="rgba(255, 255, 255, 0.5)" fontSize="9" fontFamily="monospace">DN125 AIR DUCT</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Dosya ID: {previewDoc.id}</span>
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      CAD Rendered Successfully
                    </span>
                  </div>
                </div>
              )}

              {/* Documents Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dosya Adı</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tasarım Tipi</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mevcut Sürüm</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Revizyon Notu</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Yükleme Tarihi</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-slate-400 text-sm">Dosyalar okunuyor...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredDocuments.map((doc) => {
                        const isCAD = doc.original_name.toLowerCase().endsWith(".dwg") || 
                                      doc.original_name.toLowerCase().endsWith(".dxf") || 
                                      doc.doc_type.startsWith("drawing_");
                        
                        const typeInfo = DOC_TYPES_LABELS[doc.doc_type] || DOC_TYPES_LABELS.other;

                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${isCAD ? "bg-cyan-50 text-cyan-600" : "bg-indigo-50 text-indigo-600"}`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="max-w-[200px] md:max-w-sm">
                                  <p className="font-semibold text-slate-900 text-sm truncate" title={doc.original_name}>
                                    {doc.original_name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {(doc.file_size_bytes / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${typeInfo.color} ${typeInfo.bg}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded text-xs font-semibold">
                                <Layers className="w-3 h-3 text-slate-500" /> v{doc.version}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={doc.revision_note || "Not yok"}>
                              {doc.revision_note || <span className="text-slate-300 italic">Giriş yok</span>}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {new Date(doc.created_at).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {isCAD && (
                                  <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                    title="AutoCAD Vector Önizleme"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDownload(doc.id)}
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Dosyayı İndir (OCI S3)"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedDocForVersion(doc);
                                    setIsVersionModalOpen(true);
                                  }}
                                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Yeni Sürüm/Revizyon Yükle"
                                >
                                  <FileUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Arşive Kaldır"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!docsLoading && filteredDocuments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic">
                            <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                              <FileCheck className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                              <p className="font-semibold text-slate-700 text-sm">Dosya Bulunamadı</p>
                              <p className="text-xs text-slate-400">Bu proje klasöründe aradığınız kriterlere uygun herhangi bir dosya bulunmamaktadır.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 p-12 text-center shadow-sm">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <FileText className="w-10 h-10 text-slate-400 opacity-60" />
              </div>
              <h4 className="font-bold text-slate-700 mb-1">Şantiye Klasörü Seçilmedi</h4>
              <p className="text-sm text-slate-400 max-w-sm">
                Projelere ait teknik çizimleri, DWG AutoCAD planlarını ve hakediş belgelerini yönetmek için sol panelden bir şantiye seçiniz.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Şantiyeye Dosya Yükle</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProject?.name}</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Belge / Çizim Türü</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                  value={uploadForm.doc_type}
                  onChange={(e) => setUploadForm({...uploadForm, doc_type: e.target.value})}
                  required
                >
                  <option value="drawing_hvac">Havalandırma (HVAC) Çizimi</option>
                  <option value="drawing_fire">Yangın Söndürme Çizimi</option>
                  <option value="drawing_seismic">Sismik Koruma Çizimi</option>
                  <option value="drawing_mep">MEP Koordinasyon Çizimi</option>
                  <option value="contract">Sözleşme Dosyası</option>
                  <option value="invoice_doc">Hakediş Belgesi (İcmal)</option>
                  <option value="field_report">Günlük Saha Raporu</option>
                  <option value="other">Diğer Teknik Belge</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dosya Seçimi</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                    required
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-blue-500 animate-bounce" />
                    <span className="text-sm font-semibold text-slate-700">
                      {uploadForm.file ? uploadForm.file.name : "Tıklayın veya Dosya Sürükleyin"}
                    </span>
                    <span className="text-xs text-slate-400">PDF, DWG, DXF, PNG, XLSX (Maks: 50MB)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">İlk Versiyon Revizyon Notu</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  rows={3}
                  placeholder="Örn: İlk keşif sonrası onaylanan mekanik havalandırma projesi."
                  value={uploadForm.revision_note}
                  onChange={(e) => setUploadForm({...uploadForm, revision_note: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Bulut Sistemine Yükle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Version Upload Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Yeni Sürüm (Revizyon) Ekle</h3>
                <p className="text-xs text-slate-500 mt-0.5">Versiyon yükseltme ve çizim güncelleme</p>
              </div>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleVersionSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Hedef Dosya</span>
                <span className="text-sm font-bold text-slate-800 line-clamp-1">{selectedDocForVersion?.original_name}</span>
                <span className="text-xs text-slate-500 font-medium">Güncel Versiyon: v{selectedDocForVersion?.version}</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Güncel Revize Dosya</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setVersionForm({...versionForm, file: e.target.files?.[0] || null})}
                    required
                  />
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="w-8 h-8 text-indigo-500 animate-bounce" />
                    <span className="text-sm font-semibold text-slate-700">
                      {versionForm.file ? versionForm.file.name : "Revize edilmiş dosyayı seçin"}
                    </span>
                    <span className="text-xs text-slate-400">PDF, DWG, DXF, PNG, XLSX</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Revizyon / Değişiklik Notu</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  rows={3}
                  placeholder="Örn: Mimari asma tavan revizyonu nedeniyle sismik koruma askı hatları kaydırıldı."
                  value={versionForm.revision_note}
                  onChange={(e) => setVersionForm({...versionForm, revision_note: e.target.value})}
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/10 transition-all"
              >
                Yeni Revizyon Sürümünü v{Number(selectedDocForVersion?.version || 1) + 1} Olarak Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
