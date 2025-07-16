import { nanoid } from "nanoid";

export interface BackupCode {
  code: string;
  used: boolean;
  createdAt: Date;
}

export interface MFAConfig {
  enabled: boolean;
  secret?: string;
  backupCodes: BackupCode[];
  lastUsed?: Date;
}

export function generateBackupCodes(count: number = 10): BackupCode[] {
  return Array.from({ length: count }, () => ({
    code: nanoid(8).toUpperCase(),
    used: false,
    createdAt: new Date()
  }));
}

export function validateBackupCode(codes: BackupCode[], inputCode: string): boolean {
  const code = codes.find(c => c.code === inputCode.toUpperCase() && !c.used);
  if (code) {
    code.used = true;
    return true;
  }
  return false;
}

export function generateTOTPSecret(): string {
  // In a real implementation, use a proper TOTP library
  return nanoid(32);
}

export function formatBackupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') || code;
}