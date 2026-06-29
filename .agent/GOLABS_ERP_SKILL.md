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

**Walkthrough:**
- Yapılan işi kısa, teknik ve sıralı şekilde özetleyin.
- Değişen dosyalar, doğrulamalar ve önemli kararları belirtin.
- Gereksiz uzun açıklama yapmayın; kullanıcı aynı workspace'te olduğu için dosya kopyalama talimatı vermeyin.

**Sonraki Adım:**
- Yapılacak en mantıklı sonraki aksiyonu önerin.

## Agent Prompt Rule
- Yanıt sonunda "Agent'a Verilecek Prompt" veya benzeri devredilecek prompt üretmeyin.
- Agent zaten aktif çalışandır; işi tamamlayın, walkthrough verin ve sonraki adımı önerin.
