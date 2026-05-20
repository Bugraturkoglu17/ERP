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
  FileCheck,
  Clock,
  User,
  Mail,
  Info,
  Calendar,
  Hash
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
  const [cadLayers, setCadLayers] = useState({ pipes: true, ducts: true, hangers: true });

  // Details Drawer & Versions State
  const [selectedDocForDrawer, setSelectedDocForDrawer] = useState<any | null>(null);
  const [versionsHistory, setVersionsHistory] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

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

  async function handleOpenDrawer(doc: any) {
    setSelectedDocForDrawer(doc);
    setVersionsLoading(true);
    setVersionsHistory([]);
    try {
      const versions = await apiGet(`/documents/${doc.id}/versions`);
      setVersionsHistory(Array.isArray(versions) ? versions : []);
    } catch (err) {
      console.error("Versions fetch error:", err);
      setVersionsHistory([]);
    } finally {
      setVersionsLoading(false);
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
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Projeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      {/* Header Panel */}
      <div className="bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-800 text-white">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter">Doküman & AutoCAD Çizim Havuzu</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl font-medium">
            Sismik Koruma, HVAC ve Yangın Tesisat şantiye çizimlerini, revizyon geçmişlerini ve hakediş belgelerini bulut altyapısında güvenle yönetin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Project Selector Panel */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Folder className="w-4 h-4 text-indigo-600" /> Şantiye Projeleri
            </h3>
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleSelectProject(proj)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-150 flex flex-col gap-1.5 ${
                    selectedProject?.id === proj.id 
                      ? "border-indigo-600 bg-indigo-50 shadow-none" 
                      : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="font-bold text-slate-900 text-sm line-clamp-1">{proj.name}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${selectedProject?.id === proj.id ? "rotate-90 text-indigo-600" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 tracking-wider">
                      {proj.project_no || "PROJE-NO"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
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
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Search */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Çizim veya doküman ara..." 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-600 outline-none transition-all font-bold"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Tabs */}
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-600 font-bold bg-white"
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
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-black transition-all uppercase tracking-wide"
                >
                  <Plus className="w-4 h-4" /> Yeni Dosya Yükle
                </button>
              </div>

              {/* AutoCAD Live Vector Previewer Module */}
              {previewDoc && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-slate-800 text-indigo-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">{previewDoc.original_name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">AutoCAD Vector Live View (Simüle Edilmiş)</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Layer Toggles */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Katmanlar:</span>
                        <button
                          type="button"
                          onClick={() => setCadLayers({ ...cadLayers, pipes: !cadLayers.pipes })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            cadLayers.pipes 
                              ? "bg-cyan-900/40 text-cyan-400 border-cyan-800" 
                              : "bg-transparent text-slate-500 border-transparent hover:text-slate-400"
                          }`}
                        >
                          Pipes (Boru)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCadLayers({ ...cadLayers, ducts: !cadLayers.ducts })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            cadLayers.ducts 
                              ? "bg-amber-900/40 text-amber-400 border-amber-800" 
                              : "bg-transparent text-slate-500 border-transparent hover:text-slate-400"
                          }`}
                        >
                          Ducts (Kanal)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCadLayers({ ...cadLayers, hangers: !cadLayers.hangers })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            cadLayers.hangers 
                              ? "bg-rose-900/40 text-rose-400 border-rose-800" 
                              : "bg-transparent text-slate-500 border-transparent hover:text-slate-400"
                          }`}
                        >
                          Hangers (Askı)
                        </button>
                      </div>

                      <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
                        <button type="button" onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))} className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold">-</button>
                        <span className="px-2 text-xs font-mono text-slate-300 font-bold">{previewZoom}%</span>
                        <button type="button" onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold">+</button>
                      </div>
                      
                      <button type="button" onClick={() => setPreviewDoc(null)} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative h-[320px] bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
                    <div 
                      className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"
                      style={{ transform: `scale(${previewZoom / 100})` }}
                    ></div>
                    <div 
                      className="w-[85%] h-[80%] border border-cyan-500/20 rounded relative flex items-center justify-center transition-all duration-300 bg-slate-950/85"
                      style={{ transform: `scale(${previewZoom / 100})` }}
                    >
                      <span className="absolute top-2 left-3 text-[9px] font-mono text-cyan-400 tracking-wider font-bold">VIEWPORT: {previewDoc.original_name.slice(-15)}</span>
                      <span className="absolute bottom-2 right-3 text-[9px] font-mono text-emerald-400 tracking-wider font-bold">SCALE: 1/50 METRIC</span>
                      <div className="w-[90%] h-[90%] flex items-center justify-center">
                        <svg className="w-full h-full text-slate-800" viewBox="0 0 500 250">
                          <g opacity="0.25">
                            <rect x="10" y="10" width="480" height="230" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
                            <line x1="10" y1="125" x2="490" y2="125" stroke="#475569" strokeWidth="1" strokeDasharray="8,8" />
                            <line x1="250" y1="10" x2="250" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="8,8" />
                          </g>
                          {cadLayers.pipes && (
                            <g className="transition-all duration-300">
                              <path d="M 40 80 L 220 80 L 220 180 L 440 180" fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M 40 86 L 214 86 L 214 186 L 440 186" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="3,3" />
                            </g>
                          )}
                          {cadLayers.ducts && (
                            <g className="transition-all duration-300">
                              <rect x="60" y="110" width="140" height="30" fill="rgba(245, 158, 11, 0.08)" stroke="#f59e0b" strokeWidth="2.5" />
                              <rect x="200" y="110" width="60" height="30" fill="rgba(245, 158, 11, 0.08)" stroke="#f59e0b" strokeWidth="2.5" />
                              <path d="M 260 125 L 320 125 L 320 60 L 420 60" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="square" />
                            </g>
                          )}
                          {cadLayers.hangers && (
                            <g className="transition-all duration-300">
                              {cadLayers.pipes && (
                                <>
                                  <g stroke="#f43f5e" strokeWidth="2" fill="none">
                                    <circle cx="100" cy="80" r="6" />
                                    <path d="M 94 80 L 106 80 M 100 74 L 100 86" />
                                  </g>
                                </>
                              )}
                            </g>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Dosya ID: {previewDoc.id}</span>
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      CAD Rendered Successfully
                    </span>
                  </div>
                </div>
              )}

              {/* Documents Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Dosya Adı</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tasarım Tipi</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Mevcut Sürüm</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Revizyon Notu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Yükleyen Personel</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Yükleme Tarihi</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-xs font-bold">Dosyalar okunuyor...</td>
                        </tr>
                      ) : filteredDocuments.map((doc) => {
                        const isCAD = doc.original_name.toLowerCase().endsWith(".dwg") || 
                                      doc.original_name.toLowerCase().endsWith(".dxf") || 
                                      doc.doc_type.startsWith("drawing_");
                        
                        const typeInfo = DOC_TYPES_LABELS[doc.doc_type] || DOC_TYPES_LABELS.other;

                        return (
                          <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded ${isCAD ? "bg-cyan-100 text-cyan-700" : "bg-indigo-100 text-indigo-700"}`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm truncate">{doc.original_name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{(doc.file_size_bytes / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border uppercase ${typeInfo.color} ${typeInfo.bg}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 border border-slate-200">v{doc.version}</span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">{doc.revision_note || "-"}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700">{doc.uploaded_by_name || "Bilinmiyor"}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">{new Date(doc.created_at).toLocaleDateString("tr-TR")}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleOpenDrawer(doc)} className="text-slate-400 hover:text-indigo-600"><Info className="w-4 h-4" /></button>
                                <button onClick={() => handleDownload(doc.id)} className="text-slate-400 hover:text-blue-600"><Download className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteDoc(doc.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Folder className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-bold text-slate-600">Şantiye Klasörü Seçilmedi</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg uppercase text-slate-900">Dosya Yükle</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <select className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold" value={uploadForm.doc_type} onChange={(e) => setUploadForm({...uploadForm, doc_type: e.target.value})}>
                  <option value="drawing_hvac">Havalandırma (HVAC) Çizimi</option>
                  <option value="drawing_fire">Yangın Söndürme Çizimi</option>
                  <option value="drawing_seismic">Sismik Koruma Çizimi</option>
                  <option value="drawing_mep">MEP Koordinasyon Çizimi</option>
                  <option value="contract">Sözleşme Dosyası</option>
                  <option value="invoice_doc">Hakediş Belgesi (İcmal)</option>
                  <option value="field_report">Günlük Saha Raporu</option>
                  <option value="other">Diğer Teknik Belge</option>
              </select>
              <input type="file" className="w-full" onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})} />
              <textarea className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Not..." value={uploadForm.revision_note} onChange={(e) => setUploadForm({...uploadForm, revision_note: e.target.value})} />
              <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg font-black uppercase text-sm">Yükle</button>
            </form>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg uppercase text-slate-900">Yeni Sürüm</h3>
              <button onClick={() => setIsVersionModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleVersionSubmit} className="space-y-4">
              <input type="file" className="w-full" onChange={(e) => setVersionForm({...versionForm, file: e.target.files?.[0] || null})} />
              <textarea className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Revizyon Notu..." value={versionForm.revision_note} onChange={(e) => setVersionForm({...versionForm, revision_note: e.target.value})} />
              <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg font-black uppercase text-sm">Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail Drawer */}
      {selectedDocForDrawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedDocForDrawer(null)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg uppercase">Dosya Detayları</h3>
              <button onClick={() => setSelectedDocForDrawer(null)}><X /></button>
            </div>
            <div className="space-y-4">
              <p className="font-bold text-slate-900">{selectedDocForDrawer.original_name}</p>
              <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2">
                <p>Versiyon: <span className="font-bold">v{selectedDocForDrawer.version}</span></p>
                <p>Boyut: <span className="font-bold">{(selectedDocForDrawer.file_size_bytes / 1024).toFixed(1)} KB</span></p>
              </div>
              <h4 className="font-black uppercase text-sm mt-6">Versiyon Geçmişi</h4>
              {versionsHistory.map((ver: any) => (
                <div key={ver.id} className="border-b py-2 text-xs">
                  <p className="font-bold">v{ver.version} - {new Date(ver.created_at).toLocaleDateString()}</p>
                  <p className="text-slate-500">{ver.revision_note || "Not yok"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
