export class DomainError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const fail = (code, message, status) => {
  throw new DomainError(code, message, status);
};
export function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    fail("invalid_input", "Objeto ou campo não reconhecido.");
}
export function integer(value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    fail("invalid_input", `Use um inteiro de ${min} a ${max}.`);
  return value;
}
export async function digest(value) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
