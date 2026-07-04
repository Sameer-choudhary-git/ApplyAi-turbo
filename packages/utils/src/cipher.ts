import "dotenv/config";
import { encryptionConfig } from "@applyai/config";
import crypto from "crypto";

const encryptionKey =
  "b2e03ff7cb1e3daa56dfa16fa97f45a34730eb723088f8c13581a4752867ce14";
if (!encryptionKey) {
  throw new Error("COOKIE_ENCRYPTION_KEY is missing");
}

const key = Buffer.from(encryptionKey, "hex");

if (key.length !== 32) {
  throw new Error(`Invalid key length: ${key.length}`);
}

export const encrypt = (data: object | string): string => {
  const key = Buffer.from(encryptionKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const text = typeof data === "string" ? data : JSON.stringify(data);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const key = Buffer.from(encryptionKey, "hex");
  const [ivHex, tagHex, ctHex] = encryptedText.split(":");

  const d = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );
  d.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    d.update(Buffer.from(ctHex, "hex")),
    d.final(),
  ]).toString("utf8");
};
