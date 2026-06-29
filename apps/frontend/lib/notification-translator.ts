const NOTIFICATION_MAP: Record<string, string> = {
  work_order_created: "Yeni bir iş emri oluşturuldu.",
  work_order_assigned: "Bir iş emri size atandı.",
  whatsapp_sent: "WhatsApp şablon mesajı gönderildi.",
  whatsapp_delivered: "WhatsApp mesajı alıcıya teslim edildi.",
  whatsapp_read: "WhatsApp mesajı okundu.",
  service_form_submitted: "Yeni bir servis formu sahada dolduruldu.",
  approval_requested: "Onayınız bekleyen yeni bir talep var.",
  approval_approved: "Talebiniz başarıyla onaylandı.",
  invoice_created: "Yeni bir fatura kaydı oluşturuldu."
};

export function translateNotification(event_name: string | null | undefined, fallbackText?: string): string {
  if (!event_name) return fallbackText || "Bildirim";
  return NOTIFICATION_MAP[event_name] || fallbackText || event_name;
}
