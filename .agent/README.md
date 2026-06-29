# Agent Setup

Yeni bir agent (yapay zeka asistanı) oturumu başlattığınızda sistemin karmaşık mimarisini anında kavratmak için bu yapıyı kullanabilirsiniz.

## Kısa Kullanım

1. Yeni bir sohbet (agent oturumu) başlatın.
2. Prompt alanına yalnızca şu komutu yazın:
   `SKILL:GOLABS_ERP`
   `Devam.`
3. Agent otomatik olarak `docs/AGENT_BOOTSTRAP.md`, `docs/SKILL_GOLABS_ERP.md` ve mimari envanter (architecture registry) dosyalarını okuyarak bağlamı (context) hızlıca yükleyecektir.

## Hangi Dosyalar Okunur?
- `docs/AGENT_BOOTSTRAP.md`
- `apps/backend/docs/architecture_registry.md`
- `apps/backend/docs/dependency_graph.md`
- `apps/backend/docs/event_registry.md`
- `apps/backend/docs/task_registry.md`
- `apps/backend/docs/api_inventory.md`

## Yeni Sprint Nasıl Başlatılır?
Agent bağlamı (context) okuduktan sonra size sistemdeki teknik borçların ve risklerin bir özetini sunacaktır. Ardından, agent'a sprint hedeflerinizi (Örn: "Sprint 12: Finance modülü geliştirmeleri") vererek implementasyona güvenle geçebilirsiniz.

## Agent Çıktısı Nasıl Review Edilir?
Agent her aksiyonu tamamladığında aşağıdaki formatta cevap verecektir:
- **Durum:** Onaylı / Eksik / Riskli
- **Kısa Not:** 3-5 madde özet
- **Sonraki Adım:** Sıradaki görev
- **Agent Promptu:** (Gerekirse doğrudan kopyalayabileceğiniz prompt)
