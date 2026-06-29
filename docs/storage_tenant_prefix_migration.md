# Storage Tenant Prefix Migration Plan

## Özet

PR #XXX ile Document.file_key formatı güncellendi:

| | Eski Format | Yeni Format |
|---|---|---|
| **Upload** | projects/{project_id}/{doc_type}/{ts}_{file} | 	enants/{tenant_id}/projects/{project_id}/{doc_type}/{doc_id}_{safe_file} |
| **Version** | projects/{project_id}/{doc_type}/{ts}_{file} | 	enants/{tenant_id}/projects/{project_id}/{doc_type}/{version_id}_{safe_file} |

## Etkilenen Kayıtlar

DB'deki documents tablosundaki kayıtlar iki farklı formatta ile_key içerebilir:
- **Eski** (prefix: projects/)
- **Yeni** (prefix: 	enants/)

Mevcut kod (storage.generate_presigned_url) her iki formatı da destekler — geriye dönük uyumluluk mevcuttur.

## Migration Stratejisi

### Otomatik Migration Yapılmayacak

Eski dosyaların fiziksel konumları değiştirilmeyecek. Nedenler:
1. Backblaze B2 üzerindeki move/ename işlemi yoktur — yeni key'e kopyalayıp eski key'i silmek gerekir.
2. Migration sırasında olası hata durumunda veri kaybı riski vardır.
3. Tüm eski kayıtlar DB'de tenant-kontrollü endpoint'ler üzerinden servis edilmeye devam eder.

### Opsiyonel: Kademeli Migration

Yeni dosyalar yüklenirken veya versiyon eklenirken yeni format kullanılır.
Eski kayıtlar için ayrı bir migrate_legacy_file_keys.py script'i hazırlanabilir:

\\\python
# Örnek yardımcı script (ÜRETİMDE ÇALIŞTIRMADAN ÖNCE TEST EDİN)
import asyncio
from sqlalchemy import select
from app.core.database import get_async_session
from app.core.storage import storage
from app.db.models import Document, Project

async def migrate():
    async with get_async_session() as session:
        result = await session.execute(
            select(Document).where(Document.file_key.startswith("projects/"))
        )
        docs = result.scalars().all()
        print(f"Migration edilecek doküman sayısı: {len(docs)}")
        for doc in docs:
            # Önce projeyi al
            project = await session.get(Project, doc.project_id)
            if not project or not project.tenant_id:
                print(f"  SKIP {doc.id}: tenant_id yok")
                continue
            # Yeni key hesapla
            old_key = doc.file_key
            new_key = old_key.replace(
                f"projects/{doc.project_id}",
                f"tenants/{project.tenant_id}/projects/{doc.project_id}",
                1
            )
            # Fiziksel kopyalama: B2 copy_object API
            # ... (B2 SDK çağrısı)
            doc.file_key = new_key
            print(f"  MIGRATED {doc.id}: {old_key} -> {new_key}")
        await session.commit()

asyncio.run(migrate())
\\\

## Verificasyon Adımları

1. Yeni yüklenen dosyaların B2 konsolunda 	enants/{uuid}/projects/... altında göründüğünü doğrulayın.
2. Eski projects/{uuid}/... path'li dosyaların hâlâ indirilebildiğini test edin.
3. Farklı tenant kullanıcısı ile eski format dosyayı indirmeye çalışın — 403 beklentisi.

## Güvenlik Notları

- Tenant ID artık Backblaze bucket path'inde açıkça görünmektedir. Bu production'da kabul edilebilirdir çünkü:
  - B2 bucket'ına doğrudan erişim yalnızca Application Key ile mümkündür (API backend üzerinden)
  - Presigned URL'ler tenant ID içermez (sadece imzalı path içerir)
  - Tenant ID, B2 key adında "secret" değil; veritabanında da açık tutulan bir tanımlayıcıdır.
