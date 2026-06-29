# GOLABS ERP Roadmap

## Sprint 13 - Tek Sidebar + Navigation Registry

- `Sidebar` ve `PlatformSidebar` tek sidebar bileşeninde birleşecek.
- `apps/frontend/lib/navigation.ts` merkezi navigation registry olacak.
- Platform admin menüleri aynı registry içinde `allowedRoles: ["platform_admin"]` ile görünecek.
- Tenant menüleri tenant rolleriyle sınırlı kalacak; `platform_admin` tenant operasyonel menülerini görmeyecek.
- Mobil sidebar davranışı korunacak.

## Sprint 14 - Platform Plan Modül/Lisans Yönetimi

- `PlatformPlan.modules` alanı üzerinden plan bazlı modül/lisans yönetimi UI'ı geliştirilecek.
- Platform admin plan oluştururken veya düzenlerken açık modülleri seçebilecek.
- Tenant'a plan atandığında `active_modules` ve `feature_flags` planın `modules` bilgisinden beslenecek.
- Tenant özel override ihtiyacı ayrı bir override modeli ve audit iziyle tasarlanacak.

## Sprint 15 - Tenant Admin Onboarding Wizard

- Firma admini ilk girişte onboarding wizard akışından geçecek.
- Akış sırası: firma bilgileri, ilk proje, ilk teknisyen, ilk iş emri, ilk WhatsApp gönderimi.
- Onboarding tenant bazlı izlenecek ve tamamlanmadan ana deneyime geçiş kuralları netleştirilecek.

## Sprint 16 - Product Analytics

- Tenant bazlı product analytics event toplama altyapısı kurulacak.
- İzlenecek eventler: `first_project_created`, `first_work_order_created`, `first_whatsapp_sent`, `onboarding_completed`.
- Eventler tenant izolasyonu, structured logging ve ileride raporlama ihtiyaçlarıyla uyumlu tutulacak.
