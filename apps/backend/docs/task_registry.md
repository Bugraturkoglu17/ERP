# GOLABS ERP — Background Task Registry

Bu belge sistemdeki Celery asenkron gorevlerini listeler.

| Task Name | Producer | Queue | Retry Policy | Idempotency | Failure Handling | Related Entity |
|---|---|---|---|---|---|---|
| `send_whatsapp_message_task` | `app.api.v1.routes.whatsapp` | `whatsapp_queue` | `3 retries, exponential backoff` | `message_id` | `dead_letter_queue, update_db_status_failed` | `WorkOrderWhatsappMessage` |
| `process_webhook_delivery_task` | `app.api.v1.routes.work_orders.webhook_router` | `default` | `1 retry` | `webhook_event_id` | `log_warning` | `WorkOrderWhatsappMessage` |
| `send_email_notification_task` | `app.api.v1.routes.notifications` | `email_queue` | `5 retries` | `notification_id` | `dead_letter_queue` | `ErpNotification` |
| `generate_monthly_invoice_report_task` | `celery_beat_scheduler` | `reports` | `0 retries` | `tenant_id_month` | `alert_platform_admin` | `InvoiceRecord` |
| `execute_workflow_run_task` | `app.api.v1.routes.workflow` | `default` | `3 retries, 30s delay` | `run_id` | `set_run_status_failed` | `WorkflowRun` |
| `detect_stalled_workflow_runs_task` | `celery_beat_scheduler (every 5min)` | `default` | `0 retries` | `alert_sent_at on WorkflowRun` | `log_error` | `WorkflowRun, ErpNotification` |
