import { encryptionConfig } from "@applyai/config";
import crypto from "crypto";

const encryptionKey = encryptionConfig.cookieEncryptionKey;

export const encrypt = (data: object | string): string => {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const key = Buffer.from(encryptionKey, 'hex');
  const [ivHex, tagHex, ctHex] = encryptedText.split(':');
  
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  
  return Buffer.concat([
    d.update(Buffer.from(ctHex, 'hex')),
    d.final()
  ]).toString('utf8');
};