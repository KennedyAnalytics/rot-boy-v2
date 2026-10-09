/**
 * Public-web capture policy. The studio may retrieve a page only when the
 * URL is ordinary public https. Local networks, login walls, and invented
 * hosts are out of scope.
 */
export const assertPublicHttps = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Capture refused an unreadable URL: ${value}`);
  }
  if (url.username || url.password) throw new Error("Capture refused a URL with embedded credentials.");
  if (url.protocol !== "https:") throw new Error("Capture only allows public https URLs.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    throw new Error("Capture refused a local host.");
  }
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const privateRange = a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
    if (privateRange) throw new Error("Capture refused a private network address.");
  }
  if (host.includes(":")) throw new Error("Capture refused a raw IP host.");
  return url;
};
