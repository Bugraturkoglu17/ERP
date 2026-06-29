# Bugra Selective Merge Audit Report

Bu rapor, `git@gitlab.com:bugraturkoglu441/sunucu.git` (branş: `bugra/main`) deposu ile projemizin mevcut sürümü arasındaki farkları ve yapılacak seçici entegrasyonun (Selective Merge) denetim sonuçlarını içerir.

---

## 1. Genel Durum
*   **Ortak Temel Commit (Base):** `dae4459` (fix(settings): fix duplicate JSX error...)
*   **Farklılıklar:** Buğra'nın ana dalında (`bugra/main`) iki yeni büyük commit bulunuyor (`96b8bfa` ve `70e20a2`). Bu commitler İş Emirleri, Servis Formları ve Onay Süreçlerini ERP sistemine kazandırmaktadır.
*   **Strateji:** Doğrudan `git merge` yapılmayacaktır. Sadece ihtiyaç duyulan Backend modelleri, Pydantic şemaları, route dosyaları ve Frontend bileşenleri projemizin standartlarına uyarlanarak kopyalanacaktır.

---

## 2. Backend Modelleri ve İlişkileri (`models.py`)

Klonlanan paralel repoda eklenen ve bizim projemize aktarılacak 7 yeni veritabanı tablosu şunlardır:

1.  `WorkOrder` (İş emri ana tablosu)
2.  `WorkOrderPublicLink` (Kamuya açık tokenlı dış bağlantı)
3.  `WorkOrderPhoto` (İş emirlerine yüklenen fotoğraflar)
4.  `WorkOrderServiceForm` (İş emri servis formları)
5.  `WorkOrderWhatsappMessage` (WhatsApp gönderim log tablosu)
6.  `WorkOrderActivity` (İş emri işlem akışı/log)
7.  `StoreApprovalRequest` (Fatura, hakkediş ve teklif onay talepleri)

### Denetim Bulguları:
*   **İsim Çakışması:** Mevcut tablolarla (`users`, `tenants`, `projects` vb.) hiçbir isim çakışması bulunmuyor.
*   **İlişkiler (Relationships):**
    *   `WorkOrder.project_id` -> `projects.id` ile düzgün bağlanmış.
    *   `WorkOrder.created_by` -> `users.id` ile düzgün bağlanmış.
    *   `StoreApprovalRequest.tenant_id` -> `tenants.id` ile bağlanmış (Tenant izolasyonu korunuyor).
*   **Güvenlik / Nullable:** Tüm tarihler `utc_now` ve varsayılan olarak nullable yapısıyla uyumlu. Kamu bağlantı token'ı `unique=True` ve `index=True` ile güvenceye alınmış.

---

## 3. Backend Route Dosyaları ve Uyuşmazlıklar

Kopyalanacak yeni route dosyaları:
*   `apps/backend/app/api/v1/routes/work_orders.py`
*   `apps/backend/app/api/v1/routes/approvals.py`
*   `apps/backend/app/api/v1/routes/service_forms.py`

### Kritik WhatsApp Bildirim Uyuşmazlığı:
*   Buğra'nın `/work-orders/{work_order_id}/send-whatsapp` route'undaki kod, WhatsApp Cloud API'ye doğrudan serbest metin (Free-form Text) atmaya çalışıyor.
*   **Engelleme Riski:** Meta kuralları gereği dışarıdan ilk mesaj serbest metin olamaz, `400 Bad Request` hatası döner.
*   **Çözüm:** Buğra'nın free-form kodunu iptal edip, bizim Sprint 2'de canlı sunucuda onayladığımız `servis_gorev_atamasi_v2` şablon kodunu tetikleyecek olan Celery task kuyruk entegrasyonunu (`send_whatsapp_message_task.delay`) bu route'a bağlayacağız.

---

## 4. Paket ve Bağımlılık (Dependency) Farkları

*   **Backend (`requirements.txt`):** İki repo arasında hiçbir bağımlılık farkı bulunmuyor.
*   **Frontend (`package.json`):**
    *   Bizim projemiz Next.js `^16.2.6` kullanırken, Buğra'nın deposunda Next.js `^15.5.19` sürümüne düşüş yapılmış.
    *   **Karar:** Mevcut projemizin Next.js `^16.2.6` yapısını ve ESLint yapılandırmalarını aynen koruyacağız. Bağımlılıklarda herhangi bir değişiklik yapılmayacaktır.

---

## 5. Veritabanı Migrations Farkları

*   Buğra'nın reposunda eski migration geçmişinden kalan `20260627_01_work_orders.py` adında bir dosya bulunmaktadır.
*   Biz Sprint 2'de tüm migration geçmişini temizleyip `initial_schema` altında birleştirdiğimiz için Buğra'nın migration dosyalarını **projemize dahil etmeyeceğiz.**
*   **Karar:** Backend modelleri `models.py` içerisine eklendikten sonra temiz bir şekilde `add_work_orders_and_approvals` adında yeni bir migration dosyası üreteceğiz.

---

## 6. Frontend Seçici İthalat (Selective Import) Listesi

Frontend tarafında Buğra'nın reposundan doğrudan taşınacak ve uyarlanacak dosyalar:

1.  `apps/frontend/app/bakim/` (Tüm sayfalar - faturalar, hakkedişler, icmaller, servis formları)
2.  `apps/frontend/app/tadilat/` (Tüm süreçler ve dosyalar)
3.  `apps/frontend/app/yeni-yapim/` (Tüm teklifler, işler ve hakkediş sayfaları)
4.  `apps/frontend/app/is-emirleri/` ve `apps/frontend/app/is-emri/[token]/` (Teknisyen iş emri kamu ekranı)
5.  `apps/frontend/app/onay-surecleri/` (Tüm onay talepleri ekranı)
6.  `apps/frontend/components/layout/sidebar.tsx` ve `platform-sidebar.tsx` (Yeni menü yönlendirmeleri)
7.  `apps/frontend/lib/navigation.ts` (Yeni menü ağacı)
8.  `apps/frontend/app/projects/[id]/` altındaki yeni tablar (`FaturaTab`, `HakkedisTab`, `ServisFormTab`, `WorkOrdersTab` vb.)

### Uyarlama Planı:
*   Mevcut projemizin Next.js 16 App Router ve Tailwind standartları aynen korunacaktır.
*   Giriş yapan kullanıcının session bilgisi projemizdeki `@/lib/auth` veya mevcut yapıdan çekilecektir.
*   Kamu ekranında (`/is-emri/[token]`) kesinlikle oturum açma (Auth) şartı aranmayacak, sadece token üzerinden sınırlı veri okunacaktır.
