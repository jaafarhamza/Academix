import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 1 << 17,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
} as const;

const scrypt = (
  plainPassword: string,
  salt: string,
  keyLength: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(
      plainPassword,
      salt,
      keyLength,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(plainPassword, salt, SCRYPT_KEY_LENGTH);
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, salt, hashHex] = storedHash.split('$');

  if (algorithm !== SCRYPT_PREFIX || !salt || !hashHex) {
    return false;
  }

  const expectedHash = Buffer.from(hashHex, 'hex');

  if (expectedHash.length === 0) {
    return false;
  }

  const derivedKey = await scrypt(plainPassword, salt, expectedHash.length);

  return (
    expectedHash.length === derivedKey.length &&
    timingSafeEqual(expectedHash, derivedKey)
  );
}
