/**
 * Dosyayı gerçekten cihaza indirir (sadece açmaz).
 *
 * `<a download>` özelliği SADECE aynı origin'deki linklerde çalışır — backend
 * (localhost:8000 / farklı bir domain) origin'inden gelen dosya URL'lerinde
 * tarayıcılar `download` özelliğini sessizce yok sayıp linki normal bir
 * navigasyon/yeni sekme gibi açar. Bunu önlemek için dosyayı blob olarak
 * fetch edip, sayfanın KENDİ origin'inde bir blob: URL oluşturuyoruz —
 * `download` özelliği blob: URL'lerde her zaman çalışır.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme başarısız (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Bellek sızıntısını önlemek için blob URL'yi tarayıcının indirmeyi
  // başlatmasına yetecek kısa bir gecikmeyle serbest bırak.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}
