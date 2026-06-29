import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, UploadFile
import redis.asyncio as aioredis

from app.core.upload_validator import validate_uploaded_file
from app.core.storage import StorageService
from app.core.rate_limiter import check_public_upload_rate_limit

# 1. File Validator Tests
def test_validator_file_size_exceeded():
    file = MagicMock(spec=UploadFile)
    file.filename = "test.png"
    file.content_type = "image/png"
    
    # 5 bytes content, but limit is 2 bytes -> 413
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(file, b"12345", 2, ["png"])
    assert exc.value.status_code == 413


def test_validator_invalid_extension():
    file = MagicMock(spec=UploadFile)
    file.filename = "malicious.exe"
    file.content_type = "application/x-msdownload"
    
    # Executable extension not allowed -> 400
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(file, b"MZ...", 1024, ["png", "jpg", "pdf"])
    assert exc.value.status_code == 400


def test_validator_mime_extension_mismatch():
    file = MagicMock(spec=UploadFile)
    file.filename = "spoofed.png"
    file.content_type = "application/pdf" # mismatched mime-type
    
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(file, b"%PDF-1.4...", 1024, ["png", "pdf"])
    assert exc.value.status_code == 400


def test_validator_magic_byte_mismatch():
    file = MagicMock(spec=UploadFile)
    file.filename = "spoofed.jpg"
    file.content_type = "image/jpeg"
    
    # Content is random plain text, not JPEG bytes -> 400
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(file, b"plain text content...", 1024, ["jpg"])
    assert exc.value.status_code == 400


def test_validator_valid_signatures():
    # JPG
    file_jpg = MagicMock(spec=UploadFile)
    file_jpg.filename = "photo.jpg"
    file_jpg.content_type = "image/jpeg"
    validate_uploaded_file(file_jpg, b"\xff\xd8\xff\xe0\x00\x10JFIF", 1024, ["jpg"])

    # PNG
    file_png = MagicMock(spec=UploadFile)
    file_png.filename = "photo.png"
    file_png.content_type = "image/png"
    validate_uploaded_file(file_png, b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", 1024, ["png"])

    # PDF
    file_pdf = MagicMock(spec=UploadFile)
    file_pdf.filename = "document.pdf"
    file_pdf.content_type = "application/pdf"
    validate_uploaded_file(file_pdf, b"%PDF-1.5...", 1024, ["pdf"])


# 2. Path Traversal Tests
@pytest.mark.asyncio
async def test_storage_path_traversal_detection():
    # Create instance using env fallback config to avoid boto3 connection logic
    with patch("app.core.storage.settings") as mock_settings:
        mock_settings.AWS_ACCESS_KEY_ID = ""
        mock_settings.OCI_BUCKET_NAME = "test-bucket"
        
        storage = StorageService()
        
        # Valid key -> should not raise (mock the actual upload)
        with patch.object(storage, "local_mode", True), \
             patch("builtins.open", MagicMock()), \
             patch("os.makedirs", MagicMock()):
            await storage.upload_file(b"test", "tenants/xyz/file.txt", "text/plain")
            
        # Path traversal -> raises ValueError
        with pytest.raises(ValueError, match="Path traversal"):
            await storage.upload_file(b"test", "../../escaped.txt", "text/plain")

        with pytest.raises(ValueError, match="Path traversal"):
            await storage.upload_file(b"test", "/absolute/path/file.txt", "text/plain")

        with pytest.raises(ValueError, match="Path traversal"):
            await storage.generate_presigned_url("tenants/../escaped.txt")


# 3. Redis Rate Limiting Tests
@pytest.mark.asyncio
async def test_rate_limiter_burst_and_daily():
    mock_redis = MagicMock(spec=aioredis.Redis)
    mock_get = AsyncMock()
    mock_redis.get = mock_get
    
    # 1. Burst limit hit (dakikada max 5)
    mock_get.side_effect = ["5", "0"] # burst count is 5, daily count is 0
    with patch("app.core.rate_limiter.get_redis_client", return_value=mock_redis):
        with pytest.raises(HTTPException) as exc:
            await check_public_upload_rate_limit("test_token")
        assert exc.value.status_code == 429
        assert "bir dakika bekleyin" in exc.value.detail

    # 2. Daily limit hit (günlük max 50)
    mock_get.side_effect = ["0", "50"] # burst count is 0, daily count is 50
    with patch("app.core.rate_limiter.get_redis_client", return_value=mock_redis):
        with pytest.raises(HTTPException) as exc:
            await check_public_upload_rate_limit("test_token")
        assert exc.value.status_code == 429
        assert "Günlük dosya yükleme limitine ulaştınız" in exc.value.detail

    # 3. Successful transaction increments keys
    mock_get.side_effect = [None, None] # No count yet
    mock_pipe = AsyncMock()
    mock_redis.pipeline.return_value.__aenter__.return_value = mock_pipe
    
    with patch("app.core.rate_limiter.get_redis_client", return_value=mock_redis):
        await check_public_upload_rate_limit("test_token")
        
        # Verify increments called
        mock_pipe.incr.assert_any_call("rate_limit:upload:test_token:burst")
        mock_pipe.incr.assert_any_call("rate_limit:upload:test_token:daily")
        mock_pipe.execute.assert_called_once()
