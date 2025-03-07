declare module "@xhbmygod/ripple-keypairs" {
  export interface RippleKeypair {
    privateKey: string;
    publicKey: string;
  }

  export const deriveKeypair: (
    seed: string,
    options?: any
  ) => RippleKeypair;

  export const verify: (
    message: string,
    derSignature: string,
    compressedPubKey: string
  ) => boolean;

  export const deriveAddress: (publicKey: string) => string;

  export const generateSeed: (options?: { algorithm?: string, entropy?: Buffer | Uint8Array }) => string;

  export const sign: (messageHex: any, privateKey: any) => string;
}
