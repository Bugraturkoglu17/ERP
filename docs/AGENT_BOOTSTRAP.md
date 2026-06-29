# GOLABS ERP - Agent Bootstrap

## Project Vision
Kullanıcı dostu, sade, modüler, güvenli, WhatsApp destekli ve AI-agent friendly bir ERP platformu.

## Tech Stack
- **Backend:** FastAPI, SQLModel, PostgreSQL, Celery, Redis
- **Frontend:** Next.js App Router, TailwindCSS
- **Infrastructure:** Docker (varsa), Backend & Frontend ayrık modüler yapı

## Major Modules
- Projects
- Documents
- Work Orders
- Service Forms
- Approvals
- Notifications
- WhatsApp Cloud API
- Storage
- Observability
- Architecture Registry

## Core Rules
- **Tenant isolation** default davranıştır. Tüm işlemlerde tenant bazlı izolasyon sağlanmalıdır.
- Auth olmayan endpoint sadece bilinçli **public endpoint** olabilir.
- Public endpointlerde mutlaka **rate limit** olmalı.
- **RBAC (Role-Based Access Control)** gevşetilmemeli, rol tanımları sıkı tutulmalıdır.
- Upload endpointleri kesinlikle **file validation** kullanmalı.
- Storage keyleri `tenants/{tenant_id}/` prefix standardına uymalıdır.
- WhatsApp gönderimleri **audit ve idempotency** üzerinden ilerlemeli.
- `NotificationTemplateConfig` hardcoded template yerine tercih edilmeli.
- Yeni domain eklenirken **architecture manifest** mutlaka güncellenmeli.
- Yeni endpoint eklenirse **api_inventory** ve **architecture registry** güncellenmeli.
- Business flow kırmadan **additive change (eklemeli değişiklik)** tercih edilmeli.

## Security Rules
Tüm endpoint'ler role ve tenant bazlı denetlenmelidir. `get_current_user` ve `verify_{domain}_tenant` yapılarından ödün verilmemelidir.

## Tenant Isolation Rules
Veritabanı bazında ve dosya depolama (storage) bazında her müşteri kendi (tenant) alanında izole edilmiştir. Çapraz-tenant sorgularına izin verilemez (Platform Admin istisnaları hariç).

## WhatsApp Rules
WhatsApp mesajları asenkron çalışır (Celery üzerinden). Mesaj başarı durumları webhook'lar üzerinden dinlenir ve veritabanı (audit log) güncellenir.

## Storage Rules
S3/Backblaze B2 uyumlu storage sistemi. Dosya yollarının (key) başlangıcı daima `tenants/{tenant_id}/` olmalıdır.

## Observability Rules
Yapısal (Structured JSON) loglama aktif. Her request ve Celery task bir `correlation_id` taşır. Loglar metrik analizi ve agent debug işlemleri için standartlaştırılmıştır.

## Architecture Registry Rules
Her servis kendi `.json` dosyasında mimarisini tanımlar (Bkz. `apps/backend/architecture/`). Ajanlar bu registry'yi kullanarak sistemin bağımlılıklarını ve uç noktalarını hızlıca anlar.

## Agent Response Style
- **Durum:** Onaylı / Eksik / Riskli
- **Kısa Not:** En fazla 3-5 madde
- **Sonraki Adım:** Net yapılacak iş
- **Agent'a Verilecek Prompt:** (Eğer devredilecekse kopyalanabilir prompt)

## Current Working Mode
Mega Sprintler ile modülerleşme ve güvenlik sıkılaştırma modundayız. Geliştirme öncesinde onay ve etki analizi (Impact Analysis) yapılması şarttır.

## Useful Files to Read First
- `apps/backend/docs/architecture_registry.md`
- `apps/backend/docs/dependency_graph.md`
- `apps/backend/docs/event_registry.md`
- `apps/backend/docs/task_registry.md`
