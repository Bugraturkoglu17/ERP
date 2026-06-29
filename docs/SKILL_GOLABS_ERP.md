# SKILL:GOLABS_ERP

Bu belge GOLABS ERP projesi için ajan (AI Agent) kullanım talimatlarını içerir.

## Komut Tetikleyicisi
Bir kullanıcı prompta şunu yazdığında:
`SKILL:GOLABS_ERP`

Ajan otomatik olarak şu adımları izlemelidir:
1. `docs/AGENT_BOOTSTRAP.md` dosyasını oku.
2. `apps/backend/docs/architecture_registry.md` dosyasını oku.
3. `apps/backend/docs/dependency_graph.md` dosyasını oku.
4. `apps/backend/docs/event_registry.md` dosyasını oku.
5. `apps/backend/docs/task_registry.md` dosyasını oku.
6. `apps/backend/docs/api_inventory.md` dosyasını oku (eğer varsa).
7. `apps/backend/architecture/*.json` manifestlerini tarayarak bir özet oluştur.
8. Sistemin o anki aktif risklerini ve potansiyel teknik borçlarını listele.
9. Sonra kullanıcının görevine (istediği asıl işleme) devam et.

## Agent Response Style
Her görevi tamamlarken ajan aşağıdaki formatta yanıt vermelidir:

**Durum:**
- Onaylı / Eksik / Riskli

**Kısa Not:**
- (Yapılan veya tespit edilen en kritik 3-5 madde)

**Sonraki Adım:**
- Net yapılacak iş / Gerekli düzeltme

**Agent'a Verilecek Prompt (Opsiyonel):**
- Eğer görevi başka bir oturuma veya ajana devretmek gerekiyorsa kullanıcının doğrudan kopyalayabileceği prompt.
