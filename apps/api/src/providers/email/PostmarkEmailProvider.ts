// PostmarkEmailProvider — production sağlayıcı.
// API key olmadan oluşturulamaz; lazy-loaded Postmark SDK.

import type { EmailMessage, EmailProvider } from "./EmailProvider.js";

export interface PostmarkConfig {
  apiToken: string;
  fromAddress: string;
  /** Postmark message stream (default "outbound"). Transactional flows
   *  may want a dedicated stream for invitation/MFA emails. */
  messageStream?: string;
}

export class PostmarkEmailProvider implements EmailProvider {
  readonly name = "postmark";
  private client: unknown;

  private constructor(
    private readonly config: PostmarkConfig,
    client: unknown,
  ) {
    this.client = client;
  }

  static async create(config: PostmarkConfig): Promise<PostmarkEmailProvider> {
    if (!config.apiToken) {
      throw new Error("PostmarkEmailProvider: apiToken is required");
    }
    interface PostmarkModule {
      ServerClient: new (token: string) => unknown;
    }
    let postmark: PostmarkModule;
    try {
      // Postmark is an optional peer dep, no @types/* installed.
      // @ts-expect-error -- module is optional and not type-resolved
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      postmark = await import(/* @vite-ignore */ "postmark");
    } catch {
      throw new Error("postmark is not installed; cannot use PostmarkEmailProvider");
    }
    const client = new postmark.ServerClient(config.apiToken);
    return new PostmarkEmailProvider(config, client);
  }

  async send(message: EmailMessage): Promise<void> {
    const c = this.client as {
      sendEmail: (m: {
        From: string;
        To: string;
        Subject: string;
        TextBody: string;
        HtmlBody?: string;
        MessageStream: string;
      }) => Promise<unknown>;
    };
    await c.sendEmail({
      From: this.config.fromAddress,
      To: message.to,
      Subject: message.subject,
      TextBody: message.text,
      HtmlBody: message.html,
      MessageStream: this.config.messageStream ?? "outbound",
    });
  }
}
