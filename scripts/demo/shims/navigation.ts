export function notFound(): never {
  throw new Error("Not found");
}
export function redirect(): never {
  throw new Error("Redirects are not available in the demo");
}
