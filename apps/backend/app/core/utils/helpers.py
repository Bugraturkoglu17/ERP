from datetime import datetime, timezone

def utc_now() -> datetime:
    """Merkezi UTC zaman damgası üreteci. Veritabanı uyumluluğu için timezone bilgisini kaldırır."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
