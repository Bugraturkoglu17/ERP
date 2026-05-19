from __future__ import annotations

from dataclasses import dataclass
from email.utils import parseaddr
from typing import Sequence

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import OutboundEmailAudit, PlatformTenantSettings, TenantEmailMode


@dataclass
class EmailIdentity:
    from_email: str
    from_name: str
    reply_to: str | None
    mode_applied: TenantEmailMode


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    _, email = parseaddr(value)
    normalized = (email or value).strip().lower()
    return normalized or None


def resolve_tenant_email_identity(tenant_settings: PlatformTenantSettings | None) -> EmailIdentity:
    default_from = _normalize_email(settings.EMAIL_FROM_DEFAULT) or "noreply@golabstek.com"
    default_from_name = (settings.EMAIL_FROM_NAME_DEFAULT or "GOLABS ERP").strip()
    default_reply_to = _normalize_email(settings.EMAIL_REPLY_TO_DEFAULT)

    if not tenant_settings:
        return EmailIdentity(
            from_email=default_from,
            from_name=default_from_name,
            reply_to=default_reply_to,
            mode_applied=TenantEmailMode.PLATFORM,
        )

    requested_mode = tenant_settings.email_mode or TenantEmailMode.PLATFORM
    from_name = (tenant_settings.from_name or default_from_name).strip()
    reply_to = _normalize_email(tenant_settings.reply_to) or default_reply_to
    tenant_from = _normalize_email(tenant_settings.from_email)

    if (
        requested_mode == TenantEmailMode.TENANT_DOMAIN
        and tenant_settings.email_domain_verified
        and tenant_from
    ):
        return EmailIdentity(
            from_email=tenant_from,
            from_name=from_name,
            reply_to=reply_to,
            mode_applied=TenantEmailMode.TENANT_DOMAIN,
        )

    return EmailIdentity(
        from_email=default_from,
        from_name=from_name,
        reply_to=reply_to,
        mode_applied=TenantEmailMode.PLATFORM,
    )


async def send_tenant_email(
    db: AsyncSession,
    *,
    tenant_id: str,
    tenant_settings: PlatformTenantSettings | None,
    template: str,
    to: Sequence[str],
    subject: str,
    text: str,
    html: str | None = None,
) -> OutboundEmailAudit:
    identity = resolve_tenant_email_identity(tenant_settings)
    recipients = [addr.strip().lower() for addr in to if addr and addr.strip()]
    if not recipients:
        raise ValueError("At least one recipient is required.")

    audit = OutboundEmailAudit(
        tenant_id=tenant_id,
        template=template,
        recipient_count=len(recipients),
        provider=settings.EMAIL_PROVIDER,
        status="queued",
    )
    db.add(audit)
    await db.flush()

    if settings.EMAIL_PROVIDER != "resend":
        audit.status = "failed"
        audit.error_message = f"Unsupported provider: {settings.EMAIL_PROVIDER}"
        db.add(audit)
        await db.commit()
        return audit

    if not settings.RESEND_API_KEY:
        audit.status = "failed"
        audit.error_message = "RESEND_API_KEY is not configured."
        db.add(audit)
        await db.commit()
        return audit

    payload: dict[str, object] = {
        "from": f"{identity.from_name} <{identity.from_email}>",
        "to": recipients,
        "subject": subject,
        "text": text,
    }
    if html:
        payload["html"] = html
    if identity.reply_to:
        payload["reply_to"] = [identity.reply_to]

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post("https://api.resend.com/emails", headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        audit.status = "sent"
        audit.provider_message_id = response_data.get("id")
        audit.error_message = None
    except Exception as exc:
        audit.status = "failed"
        audit.error_message = str(exc)[:2000]

    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return audit
