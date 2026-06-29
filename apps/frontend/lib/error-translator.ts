const ERROR_MAP: Record<string, string> = {
  WA_AUTH_ERROR: "WhatsApp bağlantısı kurulamadı. Lütfen entegrasyon ayarlarını denetleyin.",
  WA_RATE_LIMIT: "WhatsApp mesaj sınırına ulaşıldı. Lütfen daha sonra tekrar deneyiniz.",
  WA_INVALID_TEMPLATE: "Gönderilmek istenen WhatsApp şablonu geçersiz veya onaylanmamış.",
  STORAGE_UPLOAD_FAIL: "Dosya yüklenirken bir hata oluştu. Dosya boyutunu veya türünü kontrol edin.",
  STORAGE_PRESIGNED_FAIL: "Dosya indirme bağlantısı oluşturulamadı.",
  DB_DEADLOCK: "Veritabanı yoğunluğu nedeniyle işlem tamamlanamadı. Lütfen tekrar deneyiniz.",
  DB_TIMEOUT: "Veritabanı bağlantı zaman aşımı. Lütfen biraz sonra tekrar deneyiniz.",
  TENANT_FORBIDDEN: "Bu veriye veya işlem yetkisine sahip değilsiniz (Tenant İzolasyon İhlali).",
  AUTH_REQUIRED: "Bu işlem için oturum açmış olmanız gerekmektedir.",
  RATE_LIMITED: "Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.",
  GENERIC_ERROR: "Sistemde beklenmeyen bir hata oluştu. Lütfen teknik ekibe başvurun."
};

export function translateError(type: string | null | undefined, fallbackDetail?: string): string {
  if (!type) return fallbackDetail || ERROR_MAP.GENERIC_ERROR;
  return ERROR_MAP[type] || fallbackDetail || ERROR_MAP.GENERIC_ERROR;
}
