# GOLABS ERP - İş Emirleri & Onay Süreçleri Entegrasyonu

Bu belge, Buğra Türkoğlu'nun paralel deposundan seçici olarak kopyalanıp mevcut GOLABS ERP projesine yükseltilen modüllerin teknik detaylarını içerir.

---

## 1. Veritabanı Değişiklikleri & Alembic Göçü

Entegrasyon için veritabanına eklenen 14 tablo:
1. `store_processes`: Süreçler
2. `store_process_stages`: Süreç aşamaları
3. `store_process_notes`: Süreç notları
4. `store_activities`: Mağaza aktiviteleri
5. `store_service_forms`: Aylık servis formları
6. `store_progress_payments`: Mağaza hak ediş kayıtları
7. `store_invoice_records`: Fatura kayıtları
8. `store_approval_requests`: Onay talepleri
9. `work_orders`: İş emirleri
10. `work_order_public_links`: Kamu erişim linkleri (Token bazlı)
11. `work_order_photos`: Teknisyen/Admin yüklediği fotoğraflar
12. `work_order_service_forms`: Teknisyen yüklediği servis formları
13. `work_order_whatsapp_messages`: Gönderilen durum mesajları
14. `work_order_activities`: İş emri aktivite günlükleri

**Alembic Göç Dosyası**: `355c26ac094f_add_work_orders_and_approvals.py`
Bu dosya sunucuya (Northflank) yüklendiğinde `entrypoint.sh` tarafından otomatik algılanarak şemayı güncelleyecektir.

---

## 2. WhatsApp Bildirim Mimarı

### Serbest Metin Yerine Şablon Koruması
Buğra'nın paralel deposunda yer alan serbest metinli gönderimler, Meta Cloud API kural ihlallerine takılmaması için mevcut template tabanlı Celery altyapımıza taşınmıştır.

### Akıllı Koordinat Ayıklama (`parse_coordinates`)
İş emirlerine girilen `location_url` (örneğin Google Haritalar linki) içerisinden koordinat çifti regex ile otomatik ayrıştırılır:
- Örnek: `https://www.google.com/maps/place/39.9208,32.8541/...` -> `lat: 39.9208, long: 32.8541`
- Eğer linkte koordinat bulunamazsa varsayılan değer olarak Ankara koordinatlarına düşer.

### Celery Asenkron Gönderim
1. Kullanıcı iş emrini WhatsApp ile göndermek istediğinde sistem bir `OutboundWhatsAppAudit` kaydı oluşturur ve durumu `queued` yapar.
2. Harita header'ı, body parametreleri ve dinamik buton token'ı şablon yapısına (`servis_gorev_atamasi_v2`) göre hazırlanarak audit kaydına yazılır.
3. `send_whatsapp_message_task.delay(str(audit.id))` komutuyla iş Celery kuyruğuna alınır.

---

## 3. Ön Yüz Seçici İthalat Detayları

Ön yüzde Next.js App Router uyumlu yeni sayfalar:
- `/bakim`: Mağaza bakım süreçleri ve icmaller.
- `/tadilat`: Mağaza tadilat süreç takibi ve hak ediş onayları.
- `/yeni-yapim`: Sıfırdan inşa süreçleri ve süreç takibi.
- `/is-emirleri`: İş emirleri listesi ve oluşturma sihirbazı.
- `/is-emri/[token]`: Teknisyenin şantiye alanında telefonundan açtığı, giriş gerektirmeyen kamu formu. Buradan fotoğraf yükleyebilir, imza atabilir ve işi tamamlayabilir.
- `/onay-surecleri`: Bekleyen ve arşivlenmiş hak ediş/fatura onay istekleri paneli.

Tüm bu sayfalar mevcut Auth ve Axios sarmalayıcılara (Fetch wrapper) adapte edilmiş olup, derleme sorunsuz tamamlanmaktadır.
