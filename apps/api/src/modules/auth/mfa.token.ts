// MFA intermediate token — login akışı parolayı doğruladığında ama TOTP
// henüz girilmediğinde 5 dakikalık tek kullanımlık bir token döner. İstemci
// bu token'ı `POST /auth/login/totp` ile birlikte gönderir.
//
// JWT, ana JWT_SECRET ile imzalanır ama `type: "mfa"` ile ayrılır; access
// veya refresh ile karıştırılamaz.

import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { config } from "../../config.js";

export interface MfaTokenPayload {
  sub: string; // userId
  tenant: string; // tenantId
  role: Role;
  type: "mfa";
}

const TTL_SECONDS = 300;

export function issueMfaToken(payload: Omit<MfaTokenPayload, "type">): string {
  const opts: SignOptions = { expiresIn: TTL_SECONDS, algorithm: "HS256" };
  return jwt.sign({ ...payload, type: "mfa" } satisfies MfaTokenPayload, config.jwt.secret, opts);
}

export function verifyMfaToken(token: string): MfaTokenPayload {
  const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    (decoded as { type?: string }).type !== "mfa"
  ) {
    throw new Error("Invalid MFA token type");
  }
  return decoded as unknown as MfaTokenPayload;
}

export const MFA_TOKEN_TTL_SECONDS = TTL_SECONDS;
