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
  try {
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
  } catch (err) {
    // Depolama (OCI) bucket'ı CORS izni vermiyorsa fetch() sessizce reddedilir
    // — bu durumda blob hilesi hiç çalışamaz. Düz navigasyona düş: URL zaten
    // sunucu tarafından (Content-Disposition: attachment) zorlanan bir
    // indirme URL'iyse yine native "kaydet" diyaloğu açılır; değilse en
    // azından dosya yeni sekmede açılır — sessiz, hiçbir şey olmayan bir
    // tıklamadan çok daha iyi.
    if (err instanceof TypeError) {
      window.location.href = url;
      return;
    }
    throw err;
  }
}
