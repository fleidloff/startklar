// Self-signed HTTPS certificate for the dev server, so tablets on the LAN get a secure context (screen wake lock).
import { X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";

const dir = "certificates";
const key = `${dir}/dev-key.pem`;
const cert = `${dir}/dev.pem`;
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

function covered() {
  if (!existsSync(key) || !existsSync(cert)) return false;
  const x = new X509Certificate(readFileSync(cert));
  return new Date(x.validTo) > new Date() && ips.every((ip) => x.checkIP(ip));
}

if (!covered()) {
  mkdirSync(dir, { recursive: true });
  const san = ["DNS:localhost", "IP:127.0.0.1", "IP:::1", ...ips.map((ip) => `IP:${ip}`)].join(",");
  execFileSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "825", "-subj", "/CN=Flughafen-Manager dev", "-addext", `subjectAltName=${san}`, "-keyout", key, "-out", cert],
    { stdio: "ignore" },
  );
  console.log(`HTTPS certificate created for localhost, ${ips.join(", ")}`);
}
