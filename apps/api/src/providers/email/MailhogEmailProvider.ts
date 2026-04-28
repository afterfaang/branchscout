// MailhogEmailProvider — local SMTP (Mailhog) için lazy-loaded provider.
// nodemailer'a runtime'da import ile bağlanır; bağımlılık yüklü değilse
// fabrikası fail eder ve InMemory'ye fallback yapılır.

import type { EmailMessage, EmailProvider } from "./EmailProvider.js";

export interface MailhogConfig {
  host: string;
  port: number;
  fromAddress: string;
}

export class MailhogEmailProvider implements EmailProvider {
  readonly name = "mailhog";
  private transporter: unknown;

  private constructor(
    private readonly config: MailhogConfig,
    transporter: unknown,
  ) {
    this.transporter = transporter;
  }

  static async create(config: MailhogConfig): Promise<MailhogEmailProvider> {
    let nodemailer: { createTransport: (opts: unknown) => unknown };
    try {
      // Dynamic import — nodemailer is an optional peer dep, no @types/* installed.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      // @ts-expect-error -- module is optional and not type-resolved
      nodemailer = await import(/* @vite-ignore */ "nodemailer");
    } catch {
      throw new Error("nodemailer is not installed; cannot use MailhogEmailProvider");
    }
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
    });
    return new MailhogEmailProvider(config, transporter);
  }

  async send(message: EmailMessage): Promise<void> {
    const t = this.transporter as {
      sendMail: (m: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html?: string;
      }) => Promise<unknown>;
    };
    await t.sendMail({
      from: this.config.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
