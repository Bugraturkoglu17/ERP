import re
from typing import List
from fastapi import HTTPException, UploadFile

# İzin verilen uzantılar için magic bytes (dosya imzaları) sözlüğü
# Not: İlk birkaç byte dosya türünü doğrulamak için yeterlidir.
MAGIC_SIGNATURES = {
    # Resim formatları
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "webp": [b"RIFF"],  # Not: Offset 8'de "WEBP" olmalı, ama ilk 4 byte RIFF olması genelde yeterlidir.
    
    # Belge formatları
    "pdf": [b"%PDF"],
    
    # Arşivler ve Office Dokümanları (Docx, Xlsx vb. zip tabanlıdır)
    "zip": [b"PK\x03\x04"],
    "rar": [b"Rar!\x1a\x07\x00", b"Rar!\x1a\x07\x01\x00"],
    "docx": [b"PK\x03\x04"],
    "xlsx": [b"PK\x03\x04"],
}

# Hangi mime-type'ların hangi uzantılara izin verdiğini gösteren eşleşme tablosu
MIME_TO_EXTENSIONS = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "application/pdf": ["pdf"],
    "application/zip": ["zip"],
    "application/x-zip-compressed": ["zip"],
    "application/x-rar-compressed": ["rar"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
}

def validate_uploaded_file(
    file: UploadFile,
    file_content: bytes,
    max_size_bytes: int,
    allowed_extensions: List[str],
) -> None:
    """
    Yüklenen dosyayı boyut, uzantı, MIME türü ve binary imza (magic-bytes) açısından doğrular.
    Herhangi bir uyumsuzlukta HTTPException (400 veya 413) fırlatır.
    """
    # 1. Dosya Boyutu Kontrolü
    if len(file_content) > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya boyutu çok büyük. Maksimum izin verilen: {max_size_bytes / (1024 * 1024):.1f} MB"
        )
    
    if len(file_content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Dosya boş olamaz."
        )

    # 2. Dosya Uzantısı Kontrolü
    filename = file.filename or ""
    parts = filename.rsplit(".", 1)
    if len(parts) < 2:
        raise HTTPException(
            status_code=400,
            detail="Dosya adında geçerli bir uzantı bulunamadı."
        )
    
    ext = parts[1].lower().strip()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya uzantısı (.{ext}). İzin verilenler: {', '.join(allowed_extensions)}"
        )

    # 3. MIME Türü / Extension Uyuşması
    mime_type = (file.content_type or "").lower().strip()
    # Eğer MIME listemizde varsa, bu uzantıya izin verilip verilmediğini denetle
    if mime_type in MIME_TO_EXTENSIONS:
        valid_exts = MIME_TO_EXTENSIONS[mime_type]
        if ext not in valid_exts:
            raise HTTPException(
                status_code=400,
                detail=f"MIME türü ({mime_type}) ile dosya uzantısı (.{ext}) uyuşmuyor."
            )

    # 4. Magic-Bytes (Binary Signature) Doğrulaması
    # Dosya uzantısına göre magic signature listesini al
    expected_signatures = MAGIC_SIGNATURES.get(ext)
    if expected_signatures:
        matched = False
        for sig in expected_signatures:
            if file_content.startswith(sig):
                # Ekstra WEBP kontrolü (offset 8'de WEBP olmalı)
                if ext == "webp":
                    if len(file_content) >= 12 and file_content[8:12] == b"WEBP":
                        matched = True
                else:
                    matched = True
                break
        
        if not matched:
            raise HTTPException(
                status_code=400,
                detail=f"Dosya içeriği bildirilen uzantı (.{ext}) ile uyuşmuyor (Magic-byte doğrulanamadı)."
            )
