# GOLABS ERP — Event Bus Registry

Bu belge sistemdeki asenkron olayları listeler.

| Event Name | Producer | Consumers | Payload | Description |
|---|---|---|---|---|
| `work_order_created` | `work_orders` | `notifications, whatsapp` | `work_order_id, tenant_id, created_by` | Triggered when a new work order is created. |
| `work_order_assigned` | `work_orders` | `notifications` | `work_order_id, tenant_id, assigned_to` | Triggered when a work order is assigned to a technician or team. |
| `whatsapp_sent` | `whatsapp` | `work_orders` | `message_id, work_order_id, status` | Triggered when a WhatsApp template message is dispatched. |
| `whatsapp_delivered` | `whatsapp` | `work_orders` | `message_id, work_order_id, status` | Triggered via Webhook when WhatsApp confirms delivery. |
| `whatsapp_read` | `whatsapp` | `work_orders` | `message_id, work_order_id, status` | Triggered via Webhook when WhatsApp confirms read. |
| `service_form_submitted` | `work_orders` | `service_forms, projects` | `form_id, work_order_id, tenant_id` | Triggered when a technician submits a service form from the field. |
| `approval_requested` | `approvals` | `notifications` | `approval_id, requester_id, tenant_id, type` | Triggered when a new approval flow starts. |
| `approval_approved` | `approvals` | `finance, documents` | `approval_id, tenant_id, type` | Triggered when an approval flow completes successfully. |
| `invoice_created` | `finance` | `approvals, notifications` | `invoice_id, tenant_id, amount` | Triggered when a new invoice is recorded. |
