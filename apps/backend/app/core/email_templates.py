from __future__ import annotations

from dataclasses import dataclass

from app.db.models import Tenant


@dataclass
class MailContent:
    template: str
    subject: str
    text: str
    html: str


def _brand(title: str, body_html: str) -> str:
    return (
        "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;padding:20px;\">"
        f"<h2 style=\"margin:0 0 12px;color:#0f172a;\">{title}</h2>"
        f"<div style=\"font-size:14px;line-height:1.6;color:#334155;\">{body_html}</div>"
        "<hr style=\"margin:20px 0;border:none;border-top:1px solid #e2e8f0;\"/>"
        "<p style=\"font-size:12px;color:#64748b;\">Bu e-posta Sismik ERP tarafından gönderildi.</p>"
        "</div>"
    )


def tenant_admin_provisioned_mail(*, tenant: Tenant, full_name: str, temporary_password: str) -> MailContent:
    _ = temporary_password
    subject = f"{tenant.name} ERP - Yönetici hesabınız oluşturuldu"
    text = (
        f"Merhaba {full_name},\n\n"
        f"{tenant.name} ERP için yönetici hesabınız oluşturuldu.\n"
        "Geçici parolanız platform yöneticisi tarafından sizinle güvenli kanal üzerinden paylaşılacaktır.\n"
        "İlk girişte parolanızı değiştirmeniz istenir.\n\n"
        "Güvenlik için bu bilgiyi üçüncü kişilerle paylaşmayın."
    )
    html = _brand(
        "Yönetici hesabınız oluşturuldu",
        (
            f"<p>Merhaba <strong>{full_name}</strong>,</p>"
            f"<p><strong>{tenant.name}</strong> ERP için yönetici hesabınız oluşturuldu.</p>"
            "<p>Geçici parola bilgisi güvenlik nedeniyle e-postada paylaşılmamıştır.</p>"
            "<p>İlk girişte parolanızı değiştirmeniz istenir.</p>"
        ),
    )
    return MailContent(template="tenant_admin_provisioned", subject=subject, text=text, html=html)


def tenant_admin_password_reset_mail(*, tenant: Tenant, full_name: str, temporary_password: str) -> MailContent:
    _ = temporary_password
    subject = f"{tenant.name} ERP - Yönetici parolası sıfırlandı"
    text = (
        f"Merhaba {full_name},\n\n"
        f"{tenant.name} ERP yönetici hesabınızın parolası platform tarafından sıfırlandı.\n"
        "Yeni geçici parola güvenlik nedeniyle e-postada paylaşılmamıştır.\n"
        "Geçici parolayı platform yöneticinizden alıp ilk girişte yeni parola belirleyin."
    )
    html = _brand(
        "Parolanız sıfırlandı",
        (
            f"<p>Merhaba <strong>{full_name}</strong>,</p>"
            f"<p><strong>{tenant.name}</strong> ERP yönetici hesabınızın parolası platform tarafından sıfırlandı.</p>"
            "<p>Geçici parola bilgisi güvenlik nedeniyle e-postada paylaşılmamıştır.</p>"
            "<p>İlk girişte yeni parola belirleyin.</p>"
        ),
    )
    return MailContent(template="tenant_admin_password_reset", subject=subject, text=text, html=html)


def tenant_status_changed_mail(*, tenant: Tenant, status: str, is_active: bool) -> MailContent:
    state = "aktif" if is_active else "pasif"
    subject = f"{tenant.name} ERP - Firma durumu güncellendi"
    text = (
        f"Merhaba,\n\n"
        f"{tenant.name} firması için platform durumu güncellendi.\n"
        f"Durum: {status}\n"
        f"Erişim: {state}\n"
    )
    html = _brand(
        "Firma durumu güncellendi",
        (
            f"<p><strong>{tenant.name}</strong> firması için platform durumu güncellendi.</p>"
            f"<p>Durum: <strong>{status}</strong><br/>Erişim: <strong>{state}</strong></p>"
        ),
    )
    return MailContent(template="tenant_status_changed", subject=subject, text=text, html=html)


def project_assignment_mail(*, tenant: Tenant, project_name: str, assignee_name: str, assigned_by: str) -> MailContent:
    subject = f"{tenant.name} ERP - Proje ataması yapıldı"
    text = (
        f"Merhaba {assignee_name},\n\n"
        f"{project_name} projesine atandınız.\n"
        f"Atamayı yapan: {assigned_by}\n"
    )
    html = _brand(
        "Proje ataması yapıldı",
        (
            f"<p>Merhaba <strong>{assignee_name}</strong>,</p>"
            f"<p><strong>{project_name}</strong> projesine atandınız.</p>"
            f"<p>Atamayı yapan: <strong>{assigned_by}</strong></p>"
        ),
    )
    return MailContent(template="project_assignment", subject=subject, text=text, html=html)


def invoice_created_mail(*, tenant: Tenant, invoice_no: str, title: str, due_date: str | None, amount: str) -> MailContent:
    subject = f"{tenant.name} ERP - Yeni fatura oluşturuldu ({invoice_no})"
    due_text = due_date or "-"
    text = (
        "Merhaba,\n\n"
        f"Yeni fatura oluşturuldu.\n"
        f"Fatura No: {invoice_no}\n"
        f"Başlık: {title}\n"
        f"Vade: {due_text}\n"
        f"Tutar: {amount}\n"
    )
    html = _brand(
        "Yeni fatura oluşturuldu",
        (
            f"<p>Fatura No: <strong>{invoice_no}</strong></p>"
            f"<p>Başlık: <strong>{title}</strong></p>"
            f"<p>Vade: <strong>{due_text}</strong></p>"
            f"<p>Tutar: <strong>{amount}</strong></p>"
        ),
    )
    return MailContent(template="invoice_created", subject=subject, text=text, html=html)


def invoice_due_soon_mail(*, tenant: Tenant, invoice_no: str, due_date: str, days_left: int, amount: str) -> MailContent:
    subject = f"{tenant.name} ERP - Fatura vadesi yaklaşıyor ({invoice_no})"
    text = (
        "Merhaba,\n\n"
        f"{invoice_no} numaralı faturanın vadesine {days_left} gün kaldı.\n"
        f"Vade: {due_date}\n"
        f"Tutar: {amount}\n"
    )
    html = _brand(
        "Fatura vadesi yaklaşıyor",
        (
            f"<p>Fatura No: <strong>{invoice_no}</strong></p>"
            f"<p>Vade: <strong>{due_date}</strong> ({days_left} gün kaldı)</p>"
            f"<p>Tutar: <strong>{amount}</strong></p>"
        ),
    )
    return MailContent(template="invoice_due_soon", subject=subject, text=text, html=html)


def low_stock_alert_mail(*, tenant: Tenant, material_name: str, sku: str, current_stock: float, min_level: float) -> MailContent:
    subject = f"{tenant.name} ERP - Kritik stok uyarısı ({sku})"
    text = (
        "Merhaba,\n\n"
        "Kritik stok uyarısı oluştu.\n"
        f"Malzeme: {material_name} ({sku})\n"
        f"Mevcut: {current_stock}\n"
        f"Minimum: {min_level}\n"
    )
    html = _brand(
        "Kritik stok uyarısı",
        (
            f"<p>Malzeme: <strong>{material_name}</strong> ({sku})</p>"
            f"<p>Mevcut stok: <strong>{current_stock}</strong><br/>Minimum seviye: <strong>{min_level}</strong></p>"
        ),
    )
    return MailContent(template="inventory_low_stock", subject=subject, text=text, html=html)
