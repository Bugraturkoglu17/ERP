import logging
import redis.asyncio as aioredis
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis istemcisini tembel (lazy) olarak ilklendirmek için
_redis_client = None

def get_redis_client() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client

async def check_public_upload_rate_limit(token: str) -> None:
    """
    Public token başına rate limit denetimi yapar.
    - Dakikada maks 5 yükleme (burst)
    - 24 saatte maks 50 yükleme (daily)
    Herhangi bir limit aşımında HTTPException (429) fırlatır.
    """
    try:
        r = get_redis_client()
        
        burst_key = f"rate_limit:upload:{token}:burst"
        daily_key = f"rate_limit:upload:{token}:daily"
        
        # 1. Burst Limit Kontrolü (1 dakika)
        burst_count = await r.get(burst_key)
        if burst_count and int(burst_count) >= 5:
            logger.warning(f"Burst rate limit hit for public token: {token}")
            raise HTTPException(
                status_code=429,
                detail="Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin."
            )
            
        # 2. Daily Limit Kontrolü (24 saat)
        daily_count = await r.get(daily_key)
        if daily_count and int(daily_count) >= 50:
            logger.warning(f"Daily rate limit hit for public token: {token}")
            raise HTTPException(
                status_code=429,
                detail="Günlük dosya yükleme limitine ulaştınız. (Maks 50 dosya)"
            )
            
        # 3. Sayaçları artır ve expire sürelerini kur
        async with r.pipeline(transaction=True) as pipe:
            await pipe.incr(burst_key)
            await pipe.expire(burst_key, 60, nx=True)  # nx=True: Sadece key yeni oluşturulduğunda expire kur
            
            await pipe.incr(daily_key)
            await pipe.expire(daily_key, 86400, nx=True)
            
            await pipe.execute()
            
    except HTTPException:
        raise
    except Exception as e:
        # Fail-open stratejisi: Redis çökerse veya bağlantı hatası verirse, uygulamanın çalışmaya devam etmesi için log yazıp geçişe izin verilir.
        logger.error(f"Redis rate limiting error: {e}. Allowing request (fail-open).")


async def check_workflow_trigger_rate_limit(tenant_id: str) -> None:
    """
    Tenant bazlı Workflow Trigger rate limit denetimi.
    - Dakikada maks 60 trigger (burst)
    - 24 saatte maks 2000 trigger (daily)
    Herhangi bir limit aşımında HTTPException (429) fırlatır.
    """
    try:
        r = get_redis_client()
        
        burst_key = f"rate_limit:workflow_trigger:{tenant_id}:burst"
        daily_key = f"rate_limit:workflow_trigger:{tenant_id}:daily"
        
        # 1. Burst Limit Kontrolü (1 dakika)
        burst_count = await r.get(burst_key)
        if burst_count and int(burst_count) >= 60:
            logger.warning(f"Burst rate limit hit for workflow trigger, tenant: {tenant_id}")
            raise HTTPException(
                status_code=429,
                detail="Çok fazla trigger isteği gönderdiniz. Lütfen bir dakika bekleyin."
            )
            
        # 2. Daily Limit Kontrolü (24 saat)
        daily_count = await r.get(daily_key)
        if daily_count and int(daily_count) >= 2000:
            logger.warning(f"Daily rate limit hit for workflow trigger, tenant: {tenant_id}")
            raise HTTPException(
                status_code=429,
                detail="Günlük workflow tetikleme limitine ulaştınız. (Maks 2000)"
            )
            
        # 3. Sayaçları artır ve expire sürelerini kur
        async with r.pipeline(transaction=True) as pipe:
            await pipe.incr(burst_key)
            await pipe.expire(burst_key, 60, nx=True)
            
            await pipe.incr(daily_key)
            await pipe.expire(daily_key, 86400, nx=True)
            
            await pipe.execute()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Redis rate limiting error for workflow trigger: {e}. Allowing request (fail-open).")
