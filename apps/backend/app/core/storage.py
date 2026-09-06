# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Object Storage Service
#  Implements S3-compatible interface for OCI Object Storage
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import boto3
import re
import unicodedata
from botocore.client import Config
from botocore.exceptions import ClientError
import os
from typing import Optional

from app.core.config import settings


def sanitize_filename(name: str) -> str:
    """
    Dosya adını ve path bileşenlerini güvenli ASCII slug'a dönüştürür.
    Emoji, Türkçe özel karakter, boşluk temizlenir.
    Örnek: '📁 İZMİR ÇİĞLİ.pdf' → 'izmir-cigli.pdf'
    """
    # Emoji ve unicode symbol karakterlerini kaldır
    name = "".join(c for c in name if unicodedata.category(c) not in ("So", "Sm", "Sk", "Sc", "Cs", "Co", "Cn"))
    # Türkçe karakterleri ASCII karşılıklarıyla değiştir
    tr_map = str.maketrans("çğıiöşüÇĞIİÖŞÜ", "cgiisosCGIIOSU")
    name = name.translate(tr_map)
    # NFD normalize → ASCII olmayan karakterleri at
    name = unicodedata.normalize("NFD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    # Nokta öncesi ve sonrası kısmı ayır (extension koru)
    parts = name.rsplit(".", 1)
    stem = parts[0]
    ext = ("." + parts[1].lower()) if len(parts) == 2 else ""
    # Güvenli olmayan karakterleri tire yap, çoklu tireyi tek yap
    stem = re.sub(r"[^\w\-]", "-", stem)
    stem = re.sub(r"-{2,}", "-", stem).strip("-")
    stem = stem or "file"
    return stem + ext

class StorageService:
    """
    Sismik Mekanik ERP'nin döküman ve çizimlerini OCI Object Storage'da yönetir.
    Boto3 (S3 API) kullanılarak implement edilmiştir.
    Eğer bulut kimlik bilgileri eksikse, otomatik olarak yerel dosya sistemine (Local Storage Fallback) geçer.
    """

    def __init__(self):
        self.bucket_name = settings.OCI_BUCKET_NAME
        self.endpoint_url = str(settings.OCI_ENDPOINT) if settings.OCI_ENDPOINT else None
        
        # Development her zaman yerel depolama kullanir. Boylece gelistirme
        # makinesinde kalmis bulut anahtarlari test dosyalarini production
        # kovasina yonlendiremez. Production ise gecerli kimlik bilgileri ister.
        self.local_mode = settings.is_development or not settings.AWS_ACCESS_KEY_ID

        if self.local_mode and settings.is_production:
            raise RuntimeError("Object storage credentials are required in production.")
        
        if self.local_mode:
            print("[WARN] OCI Object Storage credentials missing! Running in LOCAL FALLBACK mode.")
            self.local_base_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                "static", 
                "uploads"
            )
            os.makedirs(self.local_base_dir, exist_ok=True)
            self.s3_client = None
        else:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    endpoint_url=self.endpoint_url,
                    region_name=settings.OCI_REGION,
                    config=Config(signature_version="s3v4"),
                )
            except Exception as e:
                print(f"[WARN] Failed to init boto3 client: {e}. Falling back to local storage.")
                self.local_mode = True
                self.local_base_dir = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                    "static", 
                    "uploads"
                )
                os.makedirs(self.local_base_dir, exist_ok=True)
                self.s3_client = None

    async def upload_file(self, file_content: bytes, file_key: str, content_type: str) -> str:
        """
        Dosyayı buluta veya yerel depolama alanına yükler.
        """
        if self.local_mode:
            try:
                target_path = os.path.join(self.local_base_dir, file_key)
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with open(target_path, "wb") as f:
                    f.write(file_content)
                print(f"[INFO] Local file stored: {target_path}", flush=True)
                return file_key
            except Exception as e:
                print(f"Local Storage Write Error: {e}")
                raise IOError(f"Yerel depolama alanına yazılırken hata oluştu: {e}")
        else:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=file_key,
                    Body=file_content,
                    ContentType=content_type,
                )
                return file_key
            except ClientError as e:
                print(f"S3 Upload Error: {e}")
                raise IOError(f"Dosya yüklenirken hata oluştu: {e}")

    async def generate_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        """
        Dosyaya erişim için imzalı URL veya yerel statik servis URL'si oluşturur.
        """
        if self.local_mode:
            # Yerel statik adresi dön (FastAPI StaticFiles Mount)
            return f"http://localhost:8000/static/uploads/{file_key}"
        else:
            try:
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": file_key},
                    ExpiresIn=expires_in,
                )
                return url
            except ClientError as e:
                print(f"S3 Presigned URL Error: {e}")
                raise IOError(f"Erişim URL'si oluşturulamadı: {e}")

    async def delete_file(self, file_key: str) -> bool:
        """
        Dosyayı fiziksel olarak siler.
        """
        if self.local_mode:
            try:
                target_path = os.path.join(self.local_base_dir, file_key)
                if os.path.exists(target_path):
                    os.remove(target_path)
                    print(f"[INFO] Local file deleted: {target_path}", flush=True)
                return True
            except Exception as e:
                print(f"Local Delete Error: {e}")
                return False
        else:
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
                return True
            except ClientError as e:
                print(f"S3 Delete Error: {e}")
                return False

# Singleton instance
storage = StorageService()
