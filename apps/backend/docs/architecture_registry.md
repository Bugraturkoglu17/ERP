# GOLABS ERP — Architecture Registry

Bu doküman `architecture/` dizinindeki manifest dosyalari (JSON) okunarak otomatik olarak uretilmistir.

## Domain: Approvals

**Description:** Satınalma, doküman veya puantaj (progress payment) süreçleri için ortak onay altyapısı.

### Entities
`ApprovalChain`, `ApprovalStep`, `ApprovalLog`

### Endpoints / Routes
`app.api.v1.routes.approvals`

### Security & Roles
- **Allowed Roles:** admin, project_manager
- **Tenant Helper:** `verify_approval_tenant`

### Events & Notifications
- **Emitted Events:** approved, rejected
- **Notifications:** approval_requested, approval_completed

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** None

---

## Domain: Documents

**Description:** Firma ve proje bazlı döküman arşivi, sürüm kontrolü (versioning) ve revizyon onay süreçleri.

### Entities
`Document`, `DocumentVersion`, `DocumentApproval`, `Folder`, `ProjectDocument`

### Endpoints / Routes
`app.api.v1.routes.documents`

### Security & Roles
- **Allowed Roles:** admin, document_controller, project_manager
- **Tenant Helper:** `verify_document_tenant`

### Events & Notifications
- **Emitted Events:** document_uploaded, document_downloaded
- **Notifications:** document_revision_requested

### Storage & Database
- **Storage Prefixes:** tenants/{tenant_id}/projects/{project_id}/docs/
- **Indexes:** None

---

## Domain: Finance

**Description:** Hak edişler, cari hesaplar, avans ve fatura gibi tüm mali kayıtların proje bazlı özeti.

### Entities
`InvoiceRecord`, `ProgressPayment`, `CashFlow`

### Endpoints / Routes
`app.api.v1.routes.finance`, `app.api.v1.routes.invoice_records`, `app.api.v1.routes.progress_payments`

### Security & Roles
- **Allowed Roles:** admin, finance_manager
- **Tenant Helper:** `verify_invoice_tenant`

### Events & Notifications
- **Emitted Events:** invoice_created, payment_received
- **Notifications:** payment_overdue

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** None

---

## Domain: Notifications

**Description:** Uygulama içi bildirim merkezi (in-app notifications).

### Entities
`ErpNotification`

### Endpoints / Routes
`app.api.v1.routes.notifications`

### Security & Roles
- **Allowed Roles:** *
- **Tenant Helper:** `verify_tenant_id (via get_current_user)`

### Events & Notifications
- **Emitted Events:** notification_read
- **Notifications:** None

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** ix_notifications_tenant_read_created

---

## Domain: Projects

**Description:** Projelerin oluşturulması, temel ayarları ve takım/kadro eşleştirmelerinden sorumlu kök modül.

### Entities
`Project`, `ProjectTeam`

### Endpoints / Routes
`app.api.v1.routes.projects`

### Security & Roles
- **Allowed Roles:** admin, project_manager
- **Tenant Helper:** `verify_project_tenant`

### Events & Notifications
- **Emitted Events:** project_created, project_updated
- **Notifications:** None

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** None

---

## Domain: Service Forms

**Description:** Saha formlarının ERP içi Store (bakım formları) sekmesindeki temsili.

### Entities
`StoreServiceForm`

### Endpoints / Routes
`app.api.v1.routes.service_forms`

### Security & Roles
- **Allowed Roles:** admin, project_manager
- **Tenant Helper:** `verify_service_form_tenant`

### Events & Notifications
- **Emitted Events:** form_approved
- **Notifications:** None

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** None

---

## Domain: Whatsapp

**Description:** Meta Graph API üzerinden şablon tabanlı WhatsApp mesajlarının asenkron (Celery) gönderimi ve webhook yönetimi.

### Entities
`WorkOrderWhatsappMessage`

### Endpoints / Routes
`app.api.v1.routes.whatsapp`, `app.api.v1.routes.work_orders.webhook_router`

### Security & Roles
- **Allowed Roles:** admin, platform_admin
- **Tenant Helper:** `verify_work_order_tenant (indirect)`

### Events & Notifications
- **Emitted Events:** whatsapp_delivered, whatsapp_failed
- **Notifications:** None

### Storage & Database
- **Storage Prefixes:** None
- **Indexes:** ix_wa_messages_wo_status_created

### Public Endpoints (No Auth)
- `/api/v1/webhooks/whatsapp`

---

## Domain: Work Orders

**Description:** Saha iş emirleri, fotoğraflar ve servis formlarının yönetiminden sorumlu ana saha operasyonları modülü.

### Entities
`WorkOrder`, `WorkOrderPhoto`, `WorkOrderServiceForm`, `WorkOrderStatus`, `WorkOrderActivity`, `StoreServiceForm`

### Endpoints / Routes
`app.api.v1.routes.work_orders`

### Security & Roles
- **Allowed Roles:** admin, project_manager, technician, site_manager
- **Tenant Helper:** `verify_work_order_tenant`

### Events & Notifications
- **Emitted Events:** photo_uploaded, form_submitted
- **Notifications:** work_order_assigned, work_order_status_changed

### Storage & Database
- **Storage Prefixes:** tenants/{tenant_id}/work-orders/
- **Indexes:** ix_work_orders_tenant_status_created

### Public Endpoints (No Auth)
- `/api/v1/public/work-orders/{token}/photos`
- `/api/v1/public/work-orders/{token}/service-form`

---

