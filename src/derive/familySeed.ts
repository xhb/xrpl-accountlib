"use strict";

import { deriveKeypair, deriveAddress, } from "@xhbmygod/ripple-keypairs";
import * as Utils from "../utils";

import Account from "../schema/Account";

const familySeed = (familyseed: string, options?: { algorithm?: string }): Account => {
  const Keypair = deriveKeypair(familyseed, options);
  const Address = deriveAddress(Keypair.publicKey);
  return new Account({
    algorithm: Utils.getAlgorithmFromKey(Keypair.privateKey),
    address: Address,
    familySeed: familyseed,
    keypair: Keypair
  });
};

export default familySeed;
