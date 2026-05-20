# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — E-posta Şablonları (Premium Whitelabel HTML Layouts)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

def get_base_html_layout(
    title: str,
    content_html: str,
    theme_color: str | None = None,
    logo_url: str | None = None,
    brand_name: str | None = None,
    frontend_url: str | None = None
) -> str:
    """
    Sistem genelinde kullanılacak premium responsive e-posta şablonu iskeleti.
    Modern HSL renk paletleri, dinamik kiracı markalaması ve whitelabel desteği içerir.
    """
    primary_color = theme_color or "#0284c7"
    brand_title = brand_name or "SİSMİK MEKANİK ERP"
    app_url = frontend_url or "http://localhost:3000"

    # Logo veya marka ismi kontrolü
    header_branding = (
        f'<img src="{logo_url}" alt="{brand_title}" style="max-height: 48px; max-width: 200px; display: inline-block; vertical-align: middle;" />'
        if logo_url
        else f'<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">{brand_title}</h1>'
    )

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            -webkit-font-smoothing: antialiased;
        }}
        .wrapper {{
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding: 40px 0;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            padding: 32px;
            text-align: center;
        }}
        .header p {{
            color: #94a3b8;
            margin: 8px 0 0 0;
            font-size: 14px;
        }}
        .content {{
            padding: 40px;
        }}
        .content h2 {{
            margin-top: 0;
            font-size: 20px;
            font-weight: 600;
            color: #0f172a;
            letter-spacing: -0.02em;
        }}
        .content p {{
            font-size: 15px;
            line-height: 1.625;
            color: #475569;
            margin-bottom: 24px;
        }}
        .card {{
            background-color: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 24px;
            margin-bottom: 28px;
        }}
        .card-row {{
            margin-bottom: 12px;
            font-size: 14px;
        }}
        .card-row:last-child {{
            margin-bottom: 0;
        }}
        .card-label {{
            font-weight: 600;
            color: #64748b;
            display: inline-block;
            width: 140px;
        }}
        .card-value {{
            color: #0f172a;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-weight: 500;
        }}
        .btn {{
            display: inline-block;
            background: {primary_color};
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
        }}
        .btn:hover {{
            filter: brightness(0.9);
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 24px 40px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }}
        .footer a {{
            color: {primary_color};
            text-decoration: none;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .badge-active {{ background-color: #dcfce7; color: #15803d; }}
        .badge-trial {{ background-color: #e0f2fe; color: #0369a1; }}
        .badge-suspended {{ background-color: #fee2e2; color: #b91c1c; }}
        .badge-archived {{ background-color: #f1f5f9; color: #475569; }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                {header_branding}
                <p>Güvenli Bulut Tabanlı Planlama Platformu</p>
            </div>
            <div class="content">
                {content_html}
            </div>
            <div class="footer">
                <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen doğrudan yanıtlamayınız.</p>
                <p>&copy; 2026 {brand_title}. Tüm hakları saklıdır. | <a href="{app_url}">Paneli Aç</a></p>
            </div>
        </div>
    </div>
</body>
</html>
"""

def build_branding_dict(
    tenant_settings: object | None,
    tenant_name: str | None = None,
    logo_url: str | None = None
) -> dict:
    """
    Veri tabanındaki kiracı ayarlarına göre dinamik markalama parametrelerini derler.
    """
    from app.core.config import settings

    branding = {
        "theme_color": "#0284c7",
        "logo_url": logo_url,
        "brand_name": tenant_name or "SİSMİK MEKANİK ERP",
        "frontend_url": settings.FRONTEND_URL,
    }

    if tenant_settings:
        if getattr(tenant_settings, "theme_color", None):
            branding["theme_color"] = tenant_settings.theme_color

        email_branding_raw = getattr(tenant_settings, "email_branding", None)
        if email_branding_raw:
            try:
                import json
                eb = (
                    json.loads(email_branding_raw)
                    if isinstance(email_branding_raw, str)
                    else email_branding_raw
                )
                if isinstance(eb, dict):
                    if eb.get("logo_url"):
                        branding["logo_url"] = eb.get("logo_url")
                    if eb.get("brand_name"):
                        branding["brand_name"] = eb.get("brand_name")
            except Exception:
                pass

    return branding

def get_provision_email_template(
    tenant_name: str,
    full_name: str,
    email: str,
    temporary_password: str,
    branding: dict | None = None
) -> tuple[str, str, str]:
    """
    Yeni oluşturulan tenant admini için karşılama ve giriş bilgileri şablonu.
    Geri dönüş: (Subject, TextContent, HTMLContent)
    """
    branding = branding or {}
    theme_color = branding.get("theme_color") or "#0284c7"
    logo_url = branding.get("logo_url")
    brand_name = branding.get("brand_name") or "SİSMİK MEKANİK ERP"
    frontend_url = branding.get("frontend_url") or "http://localhost:3000"

    subject = f"{brand_name} — Yeni Yönetici Hesabı Oluşturuldu"

    text = (
        f"Merhaba {full_name},\n\n"
        f"'{tenant_name}' firması için {brand_name} platformunda yönetici hesabınız oluşturuldu.\n\n"
        f"Giriş Bilgileriniz:\n"
        f"E-posta: {email}\n"
        f"Geçici Parola: {temporary_password}\n\n"
        f"Giriş yaptıktan sonra şifrenizi değiştirmeniz istenecektir.\n"
        f"Giriş yapmak için: {frontend_url}/login\n\n"
        f"İyi çalışmalar dileriz."
    )

    html_content = f"""
    <h2>Merhaba {full_name},</h2>
    <p><strong>{tenant_name}</strong> firması için <strong>{brand_name}</strong> platformunda yeni bir yönetici hesabı oluşturuldu.</p>
    <p>Platforma aşağıdaki geçici giriş bilgileriyle hemen erişim sağlayabilirsiniz:</p>

    <div class="card">
        <div class="card-row">
            <span class="card-label">Giriş Adresi:</span>
            <span class="card-value"><a href="{frontend_url}/login" style="color: {theme_color}; text-decoration: none;">{frontend_url}/login</a></span>
        </div>
        <div class="card-row">
            <span class="card-label">Kullanıcı Adı:</span>
            <span class="card-value">{email}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Geçici Şifre:</span>
            <span class="card-value" style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 600;">{temporary_password}</span>
        </div>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 28px; font-size: 14px; color: #b45309; line-height: 1.5;">
        <strong>⚠️ Önemli Güvenlik Uyarısı:</strong> İlk girişiniz esnasında sistem güvenliği gereği geçici şifrenizi kendi belirleyeceğiniz güçlü yeni bir şifreyle güncellemeniz zorunludur.
    </div>

    <div style="text-align: center; margin-top: 32px;">
        <a href="{frontend_url}/login" class="btn">Sisteme Giriş Yap</a>
    </div>
    """

    html = get_base_html_layout(
        subject,
        html_content,
        theme_color=theme_color,
        logo_url=logo_url,
        brand_name=brand_name,
        frontend_url=frontend_url
    )
    return subject, text, html

def get_password_reset_email_template(
    tenant_name: str,
    full_name: str,
    email: str,
    temporary_password: str,
    force_password_change: bool,
    branding: dict | None = None
) -> tuple[str, str, str]:
    """
    Yönetici şifre sıfırlama bilgileri şablonu.
    Geri dönüş: (Subject, TextContent, HTMLContent)
    """
    branding = branding or {}
    theme_color = branding.get("theme_color") or "#0284c7"
    logo_url = branding.get("logo_url")
    brand_name = branding.get("brand_name") or "SİSMİK MEKANİK ERP"
    frontend_url = branding.get("frontend_url") or "http://localhost:3000"

    subject = f"{brand_name} — Geçici Parola Sıfırlama"

    text = (
        f"Merhaba {full_name},\n\n"
        f"'{tenant_name}' firması için yönetici hesabı şifreniz sıfırlandı.\n\n"
        f"Yeni Geçici Şifreniz: {temporary_password}\n"
        f"Şifre Değişimi Zorunlu: {'Evet' if force_password_change else 'Hayır'}\n\n"
        f"Giriş yapmak için: {frontend_url}/login\n\n"
        f"İyi çalışmalar dileriz."
    )

    force_warning_html = ""
    if force_password_change:
        force_warning_html = f"""
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 28px; font-size: 14px; color: #b45309; line-height: 1.5;">
            <strong>⚠️ Parola Yenileme Zorunlu:</strong> Güvenlik politikası gereği, sisteme giriş yaptıktan sonra şifrenizi hemen güncellemeniz gerekmektedir.
        </div>
        """

    html_content = f"""
    <h2>Merhaba {full_name},</h2>
    <p><strong>{tenant_name}</strong> firması yönetici hesabınız için şifreniz sıfırlandı.</p>
    <p>Aşağıdaki geçici giriş bilgileriyle platforma giriş yapabilirsiniz:</p>

    <div class="card">
        <div class="card-row">
            <span class="card-label">Kullanıcı Adı:</span>
            <span class="card-value">{email}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Geçici Şifre:</span>
            <span class="card-value" style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 600;">{temporary_password}</span>
        </div>
    </div>

    {force_warning_html}

    <div style="text-align: center; margin-top: 32px;">
        <a href="{frontend_url}/login" class="btn">Sisteme Giriş Yap</a>
    </div>
    """

    html = get_base_html_layout(
        subject,
        html_content,
        theme_color=theme_color,
        logo_url=logo_url,
        brand_name=brand_name,
        frontend_url=frontend_url
    )
    return subject, text, html

def get_tenant_status_email_template(
    tenant_name: str,
    full_name: str,
    old_status: str,
    new_status: str,
    branding: dict | None = None
) -> tuple[str, str, str]:
    """
    Tenant (firma) durum değişikliği bildirim şablonu.
    Geri dönüş: (Subject, TextContent, HTMLContent)
    """
    branding = branding or {}
    theme_color = branding.get("theme_color") or "#0284c7"
    logo_url = branding.get("logo_url")
    brand_name = branding.get("brand_name") or "SİSMİK MEKANİK ERP"
    frontend_url = branding.get("frontend_url") or "http://localhost:3000"

    subject = f"{brand_name} — Firma Hesap Durumu Güncellendi"

    text = (
        f"Merhaba {full_name},\n\n"
        f"Platformda kayıtlı '{tenant_name}' firmanızın hesap durumu güncellenmiştir.\n\n"
        f"Eski Durum: {old_status.upper()}\n"
        f"Yeni Durum: {new_status.upper()}\n\n"
        f"Platforma giriş yapmak ve servislerinizi kontrol etmek için: {frontend_url}\n\n"
        f"İyi çalışmalar dileriz."
    )

    badge_class = f"badge-{new_status.lower()}"
    status_label_tr = {
        "trial": "Deneme Süresi",
        "active": "Aktif",
        "suspended": "Askıya Alındı",
        "archived": "Arşivlendi"
    }.get(new_status.lower(), new_status.upper())

    status_explanation = {
        "trial": "Firmanız şu anda deneme sürümündedir. Tüm platform özelliklerini sınırlı süreyle kullanabilirsiniz.",
        "active": "Firmanızın aboneliği aktiftir. ERP platformunu tam sürüm olarak kesintisiz kullanabilirsiniz.",
        "suspended": "Firmanızın hesabı geçici olarak askıya alınmıştır. Oturum açma işlemleri ve veri girişleri askıya alınmış olabilir. Destek ekibiyle iletişime geçiniz.",
        "archived": "Firmanız arşivlenmiş durumdadır. Tüm işlemler durdurulmuştur."
    }.get(new_status.lower(), "")

    html_content = f"""
    <h2>Merhaba {full_name},</h2>
    <p>Platformdaki <strong>{tenant_name}</strong> firmanızın hesap durumu güncellenmiştir.</p>

    <div class="card">
        <div class="card-row">
            <span class="card-label">Firma Adı:</span>
            <span class="card-value" style="font-family: inherit; font-weight: 600;">{tenant_name}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Eski Durum:</span>
            <span class="card-value" style="font-family: inherit; text-decoration: line-through; color: #64748b;">{old_status.upper()}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Yeni Durum:</span>
            <span class="card-value" style="font-family: inherit;">
                <span class="badge {badge_class}">{status_label_tr}</span>
            </span>
        </div>
    </div>

    <p style="background-color: #f1f5f9; border-left: 4px solid #475569; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; line-height: 1.6;">
        {status_explanation}
    </p>

    <div style="text-align: center; margin-top: 36px;">
        <a href="{frontend_url}" class="btn" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);">ERP Paneline Git</a>
    </div>
    """

    html = get_base_html_layout(
        subject,
        html_content,
        theme_color=theme_color,
        logo_url=logo_url,
        brand_name=brand_name,
        frontend_url=frontend_url
    )
    return subject, text, html

def get_low_stock_email_template(
    material_name: str,
    sku: str,
    current_stock: int,
    min_level: int,
    branding: dict | None = None
) -> tuple[str, str, str]:
    """
    Kritik stok seviyesinin altına düşen malzemeler için uyarı şablonu.
    """
    branding = branding or {}
    theme_color = branding.get("theme_color") or "#0284c7"
    logo_url = branding.get("logo_url")
    brand_name = branding.get("brand_name") or "SİSMİK MEKANİK ERP"
    frontend_url = branding.get("frontend_url") or "http://localhost:3000"

    subject = f"⚠️ Kritik Stok Uyarısı — {material_name} ({sku})"

    text = (
        f"Merhaba,\n\n"
        f"ERP sisteminde envanter takibi yapılan '{material_name}' (SKU: {sku}) malzemesinin stok seviyesi kritik sınırın altına düşmüştür.\n\n"
        f"Mevcut Stok: {current_stock} adet\n"
        f"Kritik Limit: {min_level} adet\n\n"
        f"Malzeme siparişi veya stok girişi planlamak için: {frontend_url}\n\n"
        f"İyi çalışmalar dileriz."
    )

    html_content = f"""
    <h2 style="color: #ea580c; margin-top: 0; display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 8px; vertical-align: middle;">⚠️</span> Kritik Stok Seviyesi Uyarısı
    </h2>
    <p>Envanter kontrol sistemimiz tarafından yapılan rutin denetimde, aşağıdaki malzemenin stok seviyesinin belirlenen kritik eşiğin altına indiği tespit edilmiştir.</p>

    <div class="card" style="border-left: 4px solid #ea580c;">
        <div class="card-row">
            <span class="card-label">Malzeme Adı:</span>
            <span class="card-value" style="font-family: inherit; font-weight: 600; color: #0f172a;">{material_name}</span>
        </div>
        <div class="card-row">
            <span class="card-label">SKU (Stok Kodu):</span>
            <span class="card-value">{sku}</span>
        </div>
        <div class="card-row">
            <span class="card-label">Mevcut Stok:</span>
            <span class="card-value" style="background-color: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 15px;">
                {current_stock} adet
            </span>
        </div>
        <div class="card-row">
            <span class="card-label">Kritik Eşik Limit:</span>
            <span class="card-value" style="font-weight: 600; color: #475569;">{min_level} adet</span>
        </div>
    </div>

    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 16px; margin-bottom: 28px; font-size: 14px; color: #c2410c; line-height: 1.5;">
        <strong>📢 Tavsiye Edilen Eylem:</strong> Proje teslimlerinde gecikme yaşanmaması adına en kısa sürede ilgili satınalma talebinin oluşturulması veya merkez depodan transfer planlanması önerilir.
    </div>

    <div style="text-align: center; margin-top: 32px;">
        <a href="{frontend_url}" class="btn" style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">Envanter Panelini Aç</a>
    </div>
    """

    html = get_base_html_layout(
        subject,
        html_content,
        theme_color=theme_color,
        logo_url=logo_url,
        brand_name=brand_name,
        frontend_url=frontend_url
    )
    return subject, text, html
