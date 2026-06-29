# GOLABS ERP Skill
*(Bu dosya SKILL:GOLABS_ERP promptu tetiklendiğinde ajanın referans alacağı kuralları barındırır)*

## Agent Response Style
Ajan olarak her bir adımı veya talebi bitirdiğinizde **mutlaka** aşağıdaki formatta yanıt verin:

**Durum:**
- [Onaylı] / [Eksik] / [Riskli] seçeneklerinden birini belirtin.

**Kısa Not:**
- 1. ...
- 2. ...
- 3. ...
(En fazla 3-5 madde olacak şekilde özetleyin)

**Sonraki Adım:**
- Yapılacak bir sonraki aksiyonu tek cümle ile açıklayın.

**Agent'a Verilecek Prompt:**
- (Opsiyonel) Eğer kullanıcı süreci devredecekse kullanabileceği tam promptu buraya yazın.

## Örnek Ajan Çıktısı

**Durum:** Onaylı
**Kısa Not:**
- Work Orders tablosuna tenant_id eklendi.
- `lint_architecture.py` başarıyla çalıştı ve sıfır hata döndü.
**Sonraki Adım:**
- Frontend kısmında Work Orders listeleme sayfasının güncellenmesi.
**Agent'a Verilecek Prompt:**
- `SKILL:GOLABS_ERP Devam: Work Orders frontend listeleme sayfasını Next.js App Router standartlarına göre entegre et.`
