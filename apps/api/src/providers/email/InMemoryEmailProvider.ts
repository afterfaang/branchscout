// InMemoryEmailProvider — gönderilen email'leri belleğe yazar; testlerde ve
// dev'de "henüz SMTP yok" durumlarında kullanılır. Admin paneli `GET
// /api/v1/admin/sent-emails` (geliştirme modunda) ile son N tanesini gösterir.
//
// Pino üzerinden de loglanır, böylece geliştirici terminalde gördüğü tek
// satırla davet token'ını URL içinde okuyabilir.

import type { EmailMessage, EmailProvider } from "./EmailProvider.js";

export interface SentEmail extends EmailMessage {
  sentAt: Date;
}

export class InMemoryEmailProvider implements EmailProvider {
  readonly name = "inmemory";
  private readonly outbox: SentEmail[] = [];
  private readonly maxSize: number;

  constructor(opts: { maxSize?: number; logger?: (msg: string) => void } = {}) {
    this.maxSize = opts.maxSize ?? 100;
    this.logger = opts.logger ?? ((m) => console.info(m));
  }

  private logger: (msg: string) => void;

  async send(message: EmailMessage): Promise<void> {
    const entry: SentEmail = { ...message, sentAt: new Date() };
    this.outbox.push(entry);
    while (this.outbox.length > this.maxSize) this.outbox.shift();
    this.logger(
      `[email:inmemory] -> ${message.to} | ${message.subject} | ${message.text.slice(0, 80)}…`,
    );
  }

  /** Test/dev introspection — most recent first. */
  list(limit = 25): SentEmail[] {
    return [...this.outbox].reverse().slice(0, limit);
  }

  /** Test helper — get the latest message sent to a specific recipient. */
  latestFor(email: string): SentEmail | undefined {
    return [...this.outbox].reverse().find((m) => m.to === email);
  }

  clear(): void {
    this.outbox.length = 0;
  }
}
