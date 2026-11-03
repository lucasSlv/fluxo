import { hash, verify } from "@node-rs/argon2";

// Argon2id com parâmetros recomendados pela OWASP (19 MiB, 2 iterações).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe.
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword("fluxo-dummy-password");
  return dummy;
}
