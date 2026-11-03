import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Converte documentos lean do Mongoose (ObjectId/Date) em JSON puro para Client Components. */
export function serialize<T>(value: T): Serialized<T> {
  return JSON.parse(JSON.stringify(value));
}

export type Serialized<T> = T extends Date
  ? string
  : T extends { toHexString(): string }
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
