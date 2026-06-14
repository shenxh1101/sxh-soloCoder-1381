import { generateTOTP, type HashAlgorithm } from './totp';
import { base32Encode } from './base32';

export interface TestVector {
  time: number;
  hexTime: string;
  sha1: string;
  sha256: string;
  sha512: string;
  mode: string;
}

const RFC_SECRET_ASCII = {
  sha1: '12345678901234567890',
  sha256: '12345678901234567890123456789012',
  sha512: '1234567890123456789012345678901234567890123456789012345678901234',
};

function asciiToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

export const RFC_TEST_SECRETS_BASE32 = {
  'SHA-1': base32Encode(asciiToBytes(RFC_SECRET_ASCII.sha1)),
  'SHA-256': base32Encode(asciiToBytes(RFC_SECRET_ASCII.sha256)),
  'SHA-512': base32Encode(asciiToBytes(RFC_SECRET_ASCII.sha512)),
};

export const RFC_6238_TEST_VECTORS: TestVector[] = [
  { time: 59,          hexTime: '0000000000000001', sha1: '94287082',  sha256: '46119246',  sha512: '90693936',  mode: 'T=59' },
  { time: 1111111109,  hexTime: '00000000023523EC', sha1: '07081804',  sha256: '68084774',  sha512: '25091201',  mode: '2005-03-18' },
  { time: 1111111111,  hexTime: '00000000023523ED', sha1: '14050471',  sha256: '67062674',  sha512: '99943326',  mode: '2005-03-18' },
  { time: 1234567890,  hexTime: '000000000273EF07', sha1: '89005924',  sha256: '91819424',  sha512: '93441116',  mode: '2009-02-13' },
  { time: 2000000000,  hexTime: '0000000003F940AA', sha1: '69279037',  sha256: '90698825',  sha512: '38618901',  mode: '2033-05-18' },
  { time: 20000000000, hexTime: '0000000027BC86AA', sha1: '65353130',  sha256: '77737706',  sha512: '47863826',  mode: '2603-10-11' },
];

export function formatUnixTime(seconds: number): string {
  const date = new Date(seconds * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} UTC`;
}

export interface TestResult {
  vector: TestVector;
  algorithm: HashAlgorithm;
  expected: string;
  actual: string;
  match: boolean;
}

export async function runRfcTests(selectedAlgorithm?: HashAlgorithm): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const algorithms: HashAlgorithm[] = selectedAlgorithm
    ? [selectedAlgorithm]
    : ['SHA-1', 'SHA-256', 'SHA-512'];

  const secrets = {
    'SHA-1': RFC_TEST_SECRETS_BASE32['SHA-1'],
    'SHA-256': RFC_TEST_SECRETS_BASE32['SHA-256'],
    'SHA-512': RFC_TEST_SECRETS_BASE32['SHA-512'],
  };

  for (const algo of algorithms) {
    for (const vec of RFC_6238_TEST_VECTORS) {
      const expected = algo === 'SHA-1' ? vec.sha1 : algo === 'SHA-256' ? vec.sha256 : vec.sha512;
      const actual = await generateTOTP(secrets[algo], {
        digits: 8,
        period: 30,
        algorithm: algo,
        timestamp: vec.time * 1000,
      });
      results.push({
        vector: vec,
        algorithm: algo,
        expected,
        actual,
        match: actual === expected,
      });
    }
  }

  return results;
}
