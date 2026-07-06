# GOLABS ERP — API Inventory

Bu doküman otomatik olarak üretilmiştir. API route'larının genel dökümünü içerir.

## Endpoints

| Method | Path | Tags | Auth Required | Name |
|---|---|---|---|---|
| GET | `/api/v1/approvals` | approvals | No/Unknown | list_approvals |
| GET | `/api/v1/approvals/projects/{project_id}` | approvals | No/Unknown | list_project_approvals |
| POST | `/api/v1/approvals/projects/{project_id}` | approvals | No/Unknown | create_approval |
| PATCH | `/api/v1/approvals/{approval_id}` | approvals | No/Unknown | update_approval |
| POST | `/api/v1/auth/complete-password-reset` | auth, auth | No/Unknown | complete_password_reset |
| POST | `/api/v1/auth/login` | auth, auth | No/Unknown | login |
| GET | `/api/v1/auth/me` | auth, auth | No/Unknown | get_me |
| POST | `/api/v1/auth/refresh` | auth, auth | No/Unknown | refresh_token |
| GET | `/api/v1/auth/tenant-context` | auth, auth | No/Unknown | get_tenant_context |
| PUT | `/api/v1/auth/tenant-context/profile` | auth, auth | No/Unknown | update_tenant_context_profile |
| PUT | `/api/v1/auth/tenant-context/settings` | auth, auth | No/Unknown | update_tenant_context_settings |
| GET | `/api/v1/auth/users` | auth, auth | No/Unknown | list_users |
| POST | `/api/v1/auth/users` | auth, auth | No/Unknown | create_user |
| PATCH | `/api/v1/auth/users/{user_id}` | auth, auth | No/Unknown | update_user_details |
| DELETE | `/api/v1/auth/users/{user_id}` | auth, auth | No/Unknown | delete_user_account |
| GET | `/api/v1/documents/project/{project_id}` | documents | No/Unknown | list_project_documents |
| POST | `/api/v1/documents/upload` | documents | No/Unknown | upload_document |
| PATCH | `/api/v1/documents/{doc_id}` | documents | No/Unknown | update_document |
| DELETE | `/api/v1/documents/{doc_id}` | documents | No/Unknown | delete_document |
| GET | `/api/v1/documents/{doc_id}/download` | documents | No/Unknown | download_document |
| POST | `/api/v1/documents/{doc_id}/version` | documents | No/Unknown | upload_document_version |
| GET | `/api/v1/documents/{doc_id}/versions` | documents | No/Unknown | list_document_versions |
| GET | `/api/v1/field-reports/` | field-reports | No/Unknown | list_reports |
| POST | `/api/v1/field-reports/` | field-reports | No/Unknown | create_report |
| GET | `/api/v1/field-reports/{report_id}` | field-reports | No/Unknown | get_report |
| DELETE | `/api/v1/field-reports/{report_id}` | field-reports | No/Unknown | delete_report |
| PATCH | `/api/v1/field-reports/{report_id}/approve` | field-reports | No/Unknown | approve_report |
| POST | `/api/v1/field-reports/{report_id}/items` | field-reports | No/Unknown | add_report_item |
| PATCH | `/api/v1/field-reports/{report_id}/submit` | field-reports | No/Unknown | submit_report |
| GET | `/api/v1/finance/dashboard/profitability/{project_id}` | finance | No/Unknown | get_project_profitability |
| GET | `/api/v1/finance/expenses` | finance | No/Unknown | list_expenses |
| POST | `/api/v1/finance/expenses` | finance | No/Unknown | create_expense |
| GET | `/api/v1/finance/invoices` | finance | No/Unknown | list_invoices |
| POST | `/api/v1/finance/invoices` | finance | No/Unknown | create_invoice |
| GET | `/api/v1/finance/invoices/calendar` | finance | No/Unknown | get_invoice_calendar |
| GET | `/api/v1/finance/invoices/{invoice_id}` | finance | No/Unknown | get_invoice |
| GET | `/api/v1/finance/payments` | finance | No/Unknown | list_payments |
| POST | `/api/v1/finance/payments` | finance | No/Unknown | create_payment |
| GET | `/api/v1/health` | meta | No/Unknown | health_check |
| GET | `/api/v1/inventory/alerts/low-stock` | inventory | No/Unknown | list_low_stock_alerts |
| POST | `/api/v1/inventory/materials` | inventory | No/Unknown | create_material |
| GET | `/api/v1/inventory/materials` | inventory | No/Unknown | list_materials |
| GET | `/api/v1/inventory/materials/{material_id}` | inventory | No/Unknown | get_material |
| PATCH | `/api/v1/inventory/materials/{material_id}` | inventory | No/Unknown | update_material |
| DELETE | `/api/v1/inventory/materials/{material_id}` | inventory | No/Unknown | delete_material |
| GET | `/api/v1/inventory/stock` | inventory | No/Unknown | get_global_stock |
| POST | `/api/v1/inventory/transactions` | inventory | No/Unknown | create_transaction |
| GET | `/api/v1/inventory/transactions` | inventory | No/Unknown | list_transactions |
| GET | `/api/v1/inventory/transactions/{transaction_id}` | inventory | No/Unknown | get_transaction |
| POST | `/api/v1/inventory/transfer` | inventory | No/Unknown | transfer_stock |
| POST | `/api/v1/inventory/warehouses` | inventory | No/Unknown | create_warehouse |
| GET | `/api/v1/inventory/warehouses` | inventory | No/Unknown | list_warehouses |
| GET | `/api/v1/inventory/warehouses/{warehouse_id}` | inventory | No/Unknown | get_warehouse |
| PATCH | `/api/v1/inventory/warehouses/{warehouse_id}` | inventory | No/Unknown | update_warehouse |
| DELETE | `/api/v1/inventory/warehouses/{warehouse_id}` | inventory | No/Unknown | delete_warehouse |
| GET | `/api/v1/inventory/warehouses/{warehouse_id}/stock` | inventory | No/Unknown | get_warehouse_stock |
| GET | `/api/v1/invoice-records` | invoice-records | No/Unknown | list_all_invoices |
| GET | `/api/v1/invoice-records/projects/{project_id}` | invoice-records | No/Unknown | list_invoices |
| POST | `/api/v1/invoice-records/projects/{project_id}` | invoice-records | No/Unknown | create_invoice |
| DELETE | `/api/v1/invoice-records/{invoice_id}` | invoice-records | No/Unknown | delete_invoice |
| GET | `/api/v1/meta/openapi-summary` | meta | No/Unknown | openapi_summary |
| GET | `/api/v1/meta/routes` | meta | No/Unknown | list_routes |
| GET | `/api/v1/meta/security-matrix` | meta | No/Unknown | security_matrix |
| GET | `/api/v1/notifications` | notifications | No/Unknown | list_notifications |
| POST | `/api/v1/notifications/mark-all-read` | notifications | No/Unknown | mark_all_read |
| GET | `/api/v1/notifications/unread-count` | notifications | No/Unknown | unread_count |
| PATCH | `/api/v1/notifications/{notification_id}/read` | notifications | No/Unknown | mark_read |
| PATCH | `/api/v1/platform/admin-users/{user_id}` | platform, platform | No/Unknown | update_tenant_admin_user |
| GET | `/api/v1/platform/audit` | platform, platform | No/Unknown | list_audit_logs |
| POST | `/api/v1/platform/plans` | platform, platform | No/Unknown | create_plan |
| GET | `/api/v1/platform/plans` | platform, platform | No/Unknown | list_plans |
| GET | `/api/v1/platform/subscriptions` | platform, platform | No/Unknown | list_subscriptions |
| POST | `/api/v1/platform/subscriptions/assign` | platform, platform | No/Unknown | assign_subscription |
| GET | `/api/v1/platform/tenants` | platform, platform | No/Unknown | list_tenants |
| GET | `/api/v1/platform/modules` | platform | Yes | list_modules |
| GET | `/api/v1/platform/features` | platform | Yes | list_features |
| GET | `/api/v1/platform/quotas` | platform | Yes | list_quotas |
| GET | `/api/v1/platform/marketplace/listings` | platform | Yes | list_marketplace_listings |
| POST | `/api/v1/platform/tenants/{tenant_id}/marketplace/install` | platform | Yes | install_marketplace_listing |
| GET | `/api/v1/platform/tenants/{tenant_id}/entitlements` | platform | Yes | get_tenant_entitlements |
| PUT | `/api/v1/platform/tenants/{tenant_id}/overrides` | platform | Yes | upsert_tenant_override |
| GET | `/api/v1/platform/tenants/{tenant_id}/usage` | platform | Yes | get_tenant_usage |
| POST | `/api/v1/platform/tenants/{tenant_id}/usage` | platform | Yes | record_tenant_usage |
| GET | `/api/v1/meta/modules` | meta | Yes | module_registry_summary |
| POST | `/api/v1/platform/tenants` | platform, platform | No/Unknown | create_tenant |
| POST | `/api/v1/platform/tenants/provision-admin` | platform, platform | No/Unknown | provision_tenant_admin |
| PATCH | `/api/v1/platform/tenants/{tenant_id}` | platform, platform | No/Unknown | update_tenant |
| GET | `/api/v1/platform/tenants/{tenant_id}/admins` | platform, platform | No/Unknown | list_tenant_admins |
| POST | `/api/v1/platform/tenants/{tenant_id}/reset-admin-password` | platform, platform | No/Unknown | reset_tenant_admin_password |
| PUT | `/api/v1/platform/tenants/{tenant_id}/settings` | platform, platform | No/Unknown | upsert_tenant_settings |
| GET | `/api/v1/platform/tenants/{tenant_id}/settings` | platform, platform | No/Unknown | get_tenant_settings |
| GET | `/api/v1/process/active-jobs` | store-process | No/Unknown | get_active_jobs |
| GET | `/api/v1/process/projects/{project_id}/activities` | store-process | No/Unknown | get_activities |
| GET | `/api/v1/process/projects/{project_id}/process` | store-process | No/Unknown | get_project_processes |
| POST | `/api/v1/process/projects/{project_id}/process` | store-process | No/Unknown | create_process |
| POST | `/api/v1/process/projects/{project_id}/process/bulk` | store-process | No/Unknown | create_bulk_processes |
| DELETE | `/api/v1/process/projects/{project_id}/process/{process_id}` | store-process | No/Unknown | delete_process |
| PATCH | `/api/v1/process/projects/{project_id}/process/{process_id}` | store-process | No/Unknown | update_process |
| PATCH | `/api/v1/process/projects/{project_id}/process/{process_id}/cancel` | store-process | No/Unknown | cancel_process |
| POST | `/api/v1/process/projects/{project_id}/process/{process_id}/notes` | store-process | No/Unknown | add_note |
| GET | `/api/v1/process/projects/{project_id}/process/{process_id}/notes` | store-process | No/Unknown | get_notes |
| PATCH | `/api/v1/process/projects/{project_id}/process/{process_id}/stages/{stage_id}` | store-process | No/Unknown | update_stage |
| GET | `/api/v1/procurement/orders` | procurement | No/Unknown | list_orders |
| POST | `/api/v1/procurement/orders` | procurement | No/Unknown | create_order |
| PATCH | `/api/v1/procurement/orders/{order_id}/receive` | procurement | No/Unknown | receive_order |
| GET | `/api/v1/procurement/requests` | procurement | No/Unknown | list_requests |
| POST | `/api/v1/procurement/requests` | procurement | No/Unknown | create_request |
| PATCH | `/api/v1/procurement/requests/{request_id}/review` | procurement | No/Unknown | review_request |
| GET | `/api/v1/procurement/suppliers` | procurement | No/Unknown | list_suppliers |
| POST | `/api/v1/procurement/suppliers` | procurement | No/Unknown | create_supplier |
| PATCH | `/api/v1/procurement/suppliers/{supplier_id}` | procurement | No/Unknown | update_supplier |
| DELETE | `/api/v1/procurement/suppliers/{supplier_id}` | procurement | No/Unknown | delete_supplier |
| GET | `/api/v1/progress-payments` | progress-payments | No/Unknown | list_all_payments |
| GET | `/api/v1/progress-payments/projects/{project_id}` | progress-payments | No/Unknown | list_payments |
| POST | `/api/v1/progress-payments/projects/{project_id}` | progress-payments | No/Unknown | create_payment |
| POST | `/api/v1/progress-payments/sync-approvals` | progress-payments | No/Unknown | sync_payment_approvals |
| DELETE | `/api/v1/progress-payments/{payment_id}` | progress-payments | No/Unknown | delete_payment |
| PATCH | `/api/v1/progress-payments/{payment_id}` | progress-payments | No/Unknown | update_payment |
| GET | `/api/v1/projects` | projects | No/Unknown | list_projects |
| POST | `/api/v1/projects` | projects | No/Unknown | create_project |
| POST | `/api/v1/projects/branches` | projects, hierarchy | No/Unknown | create_branch |
| PATCH | `/api/v1/projects/branches/{branch_id}` | projects, hierarchy | No/Unknown | update_branch |
| DELETE | `/api/v1/projects/branches/{branch_id}` | projects, hierarchy | No/Unknown | delete_branch |
| GET | `/api/v1/projects/branches/{region_id}` | projects, hierarchy | No/Unknown | list_branches_by_region |
| GET | `/api/v1/projects/customers` | projects, hierarchy | No/Unknown | list_customers |
| POST | `/api/v1/projects/customers` | projects, hierarchy | No/Unknown | create_customer |
| PATCH | `/api/v1/projects/customers/{customer_id}` | projects, hierarchy | No/Unknown | update_customer |
| DELETE | `/api/v1/projects/customers/{customer_id}` | projects, hierarchy | No/Unknown | delete_customer |
| GET | `/api/v1/projects/hierarchy/download-csv` | projects, hierarchy | No/Unknown | download_chain_csv |
| POST | `/api/v1/projects/hierarchy/import-custom-csv` | projects, hierarchy | No/Unknown | import_custom_csv |
| POST | `/api/v1/projects/hierarchy/import-template-chain` | projects, hierarchy | No/Unknown | import_template_chain |
| POST | `/api/v1/projects/regions` | projects, hierarchy | No/Unknown | create_region |
| GET | `/api/v1/projects/regions/{customer_id}` | projects, hierarchy | No/Unknown | list_regions_by_customer |
| PATCH | `/api/v1/projects/regions/{region_id}` | projects, hierarchy | No/Unknown | update_region |
| DELETE | `/api/v1/projects/regions/{region_id}` | projects, hierarchy | No/Unknown | delete_region |
| GET | `/api/v1/projects/{project_id}` | projects | No/Unknown | get_project |
| PATCH | `/api/v1/projects/{project_id}` | projects | No/Unknown | update_project |
| DELETE | `/api/v1/projects/{project_id}` | projects | No/Unknown | delete_project |
| POST | `/api/v1/projects/{project_id}/assignments` | projects | No/Unknown | assign_user_to_project |
| GET | `/api/v1/projects/{project_id}/assignments` | projects | No/Unknown | list_assignments |
| GET | `/api/v1/public/work-orders/{token}` | public | No (Public) | public_get_work_order |
| POST | `/api/v1/public/work-orders/{token}/photos` | public | No (Public) | public_upload_photo |
| POST | `/api/v1/public/work-orders/{token}/service-form` | public | No (Public) | public_upload_service_form |
| POST | `/api/v1/public/work-orders/{token}/submit` | public | No (Public) | public_submit_work_order |
| GET | `/api/v1/ready` | meta | No/Unknown | readiness_probe |
| GET | `/api/v1/service-forms` | service-forms | No/Unknown | list_all_service_forms |
| GET | `/api/v1/service-forms/projects/{project_id}` | service-forms | No/Unknown | list_service_forms |
| POST | `/api/v1/service-forms/projects/{project_id}` | service-forms | No/Unknown | create_service_form |
| DELETE | `/api/v1/service-forms/{form_id}` | service-forms | No/Unknown | delete_service_form |
| GET | `/api/v1/webhooks/whatsapp` | webhooks | No (Public) | whatsapp_webhook_verify |
| POST | `/api/v1/webhooks/whatsapp` | webhooks | No (Public) | whatsapp_webhook_receive |
| POST | `/api/v1/whatsapp/test-template` | whatsapp | No/Unknown | test_template |
| GET | `/api/v1/whatsapp/webhook` | whatsapp | No/Unknown | verify_webhook |
| POST | `/api/v1/whatsapp/webhook` | whatsapp | No/Unknown | receive_webhook |
| POST | `/api/v1/work-orders` | work-orders | No/Unknown | create_work_order |
| GET | `/api/v1/work-orders` | work-orders | No/Unknown | list_work_orders |
| GET | `/api/v1/work-orders/stats` | work-orders | No/Unknown | get_work_order_stats |
| GET | `/api/v1/work-orders/{work_order_id}` | work-orders | No/Unknown | get_work_order |
| PATCH | `/api/v1/work-orders/{work_order_id}` | work-orders | No/Unknown | update_work_order |
| DELETE | `/api/v1/work-orders/{work_order_id}` | work-orders | No/Unknown | delete_work_order |
| POST | `/api/v1/work-orders/{work_order_id}/photos` | work-orders | No/Unknown | upload_admin_photo |
| GET | `/api/v1/work-orders/{work_order_id}/preview-message` | work-orders | No/Unknown | preview_whatsapp_message |
| POST | `/api/v1/work-orders/{work_order_id}/send-whatsapp` | work-orders | No/Unknown | send_whatsapp |
| GET | `/api/v1/work-orders/{work_order_id}/whatsapp-messages` | work-orders | No/Unknown | get_work_order_whatsapp_messages |
