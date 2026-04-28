// EmailProvider — provider abstraction (ARCHITECTURE.md § 6).
// Auth gerektirmeyen davet/MFA email'leri için tek arayüz.
// Implementasyonlar: InMemoryEmailProvider (dev/test), PostmarkEmailProvider
// (production), MailhogEmailProvider (local SMTP).

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. UI üzerinden HTML render etmek isteyen sağlayıcılar
   *  bunu kendi template'lerine map'leyebilir. */
  text: string;
  /** Optional HTML body. */
  html?: string;
}

export interface EmailProvider {
  /** Returns when the provider has accepted the message; throws on failure. */
  send(message: EmailMessage): Promise<void>;

  /** Logical name — used in logs and CLI output. */
  readonly name: string;
}
