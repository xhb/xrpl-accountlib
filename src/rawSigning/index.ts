"use strict";

import * as Utils from "../utils";
import { setNativeAsset } from "../sign";
import assert from "assert";
import { decode, type XrplDefinitions } from "@xhbmygod/ripple-binary-codec";

type PreparedRawTransaction = {
  pubkey: string;
  signingPubKey: string;
  multiSign: boolean;
  transaction: Record<string, unknown>;
  message: string;
  hashToSign: string;
};

type SignedRawObject = {
  type: "SignedTx" | "MultiSignedTx" | "SignedPayChanAuth";
  txnSignature: string;
  signatureVerifies: boolean;
  txJson: Record<string, unknown>;
  signedTransaction: string;
  id: string;
};

type SignerAndSignature = {
  pubKey: string;
  signature: string;
};

const assertValidPubkey = (pubkey: string): void => {
  assert(typeof pubkey === "string", "Uncompressed PubKey: string expected");
  if (pubkey.length === 64) {
    // ED Uncompressed
    assert(
      Utils.getAlgorithmFromKey("ED" + pubkey) === "ed25519",
      "Key length ed25519, algo not ed25519"
    );
  } else if (pubkey.length === 66) {
    // Compressed (?)
    assert(
      Utils.deriveAddress("A" + pubkey.slice(1)),
      "Compressed PubKey length, invalid address derivation"
    );
  } else {
    // Secp256k1 Uncompressed
    assert(pubkey.length === 130, "Uncompressed PubKey: incorrect length");
    assert(
      pubkey.slice(0, 2) === "04",
      'Uncompressed PubKey: should start with "04"'
    );
  }
};

/**
 * Prepare a transaction for a Raw card: get Hash to sign
 */
const prepare = (
  txJson: Record<string, unknown>,
  pubkey: string,
  multiSign = false,
  definitions?: XrplDefinitions
): PreparedRawTransaction => {
  assertValidPubkey(pubkey);

  const signingPubKey = Utils.compressPubKey(pubkey);
  const transaction = Object.assign({}, { ...txJson });

  setNativeAsset(transaction);

  assert(
    typeof transaction === "object" && transaction !== null,
    "Transaction: Object expected"
  );
  if (typeof transaction.signingPubKey === "undefined") {
    Object.assign(transaction, { SigningPubKey: signingPubKey });
  }

  if (multiSign) {
    Object.assign(transaction, { SigningPubKey: "" });
  }

  // Payment Channel Authorization
  if (
    String(transaction?.TransactionType || "").toLowerCase() ===
      "paymentchannelauthorize" ||
    String(transaction?.command || "").toLowerCase() === "channel_authorize" ||
    (!transaction?.TransactionType &&
      !transaction?.command &&
      ((transaction?.channel && transaction?.amount) ||
        (transaction?.Channel && transaction?.Amount)))
  ) {
    Object.assign(transaction, {
      TransactionType: undefined,
      command: undefined,
      channel: transaction?.channel || transaction?.Channel,
      amount: transaction?.amount || transaction?.Amount,
    });
  }

  const message = Utils.encodeTransaction(
    transaction,
    multiSign ? Utils.deriveAddress(signingPubKey) : undefined,
    definitions
  );

  const hashToSign =
    Utils.getAlgorithmFromKey(signingPubKey) === "ed25519"
      ? message
      : Utils.bytesToHex(Utils.hash(message));

  return {
    pubkey,
    signingPubKey,
    multiSign,
    transaction,
    message,
    hashToSign,
  };
};

const complete = (
  Prepared: PreparedRawTransaction,
  signature: string,
  definitions?: XrplDefinitions
): SignedRawObject => {
  assertValidPubkey(Prepared.pubkey);
  assert(typeof signature === "string", "signature: string expected");
  assert(signature.length === 128, "signature: incorrect length");

  const txnSignature =
    Utils.getAlgorithmFromKey(Prepared.signingPubKey) === "ed25519"
      ? signature
      : Utils.secp256k1_p1363ToFullyCanonicalDerSignature(signature);

  const signatureVerifies = Utils.verifySignature(
    Prepared.message,
    txnSignature,
    Prepared.signingPubKey
  );

  let isPayChanAuth = false;
  let txJson: Record<string, unknown> = {};
  let signedTransaction: string = "";
  let id: string = "";

  Object.assign(txJson, Prepared.transaction);

  setNativeAsset(txJson);

  if (signatureVerifies) {
    Object.assign(txJson, { TxnSignature: txnSignature });

    signedTransaction = Utils.encodeTransaction(txJson, undefined, definitions);
    id = Utils.computeBinaryTransactionHash(signedTransaction);
  }

  // Payment channel auth
  if (
    !txJson?.TransactionType &&
    !txJson?.command &&
    txJson?.channel &&
    txJson?.amount
  ) {
    isPayChanAuth = true;
    id = "";
    signedTransaction = String(txJson.TxnSignature || "");
    txJson = {
      channel: txJson.channel,
      amount: txJson.amount,
    };
  }

  return {
    type: isPayChanAuth ? "SignedPayChanAuth" : "SignedTx",
    txnSignature,
    signatureVerifies,
    txJson,
    signedTransaction,
    id,
  };
};

const completeMultiSigned = (
  txJson: Record<string, unknown>,
  SignersAndSignatures: SignerAndSignature[],
  definitions?: XrplDefinitions
): SignedRawObject => {
  assert(Array.isArray(SignersAndSignatures), "SignersAndSignatures not array");
  assert(SignersAndSignatures.length > 0, "SignersAndSignatures empty");

  const transaction = Object.assign({}, txJson);

  setNativeAsset(txJson);

  Object.assign(transaction, { SigningPubKey: "" });
  // const hashToSign = Utils.bytesToHex(Utils.hash(message))

  const toCombine = SignersAndSignatures.map((SignerAndSignature) => {
    const pubKey =
      SignerAndSignature.pubKey.length === 130
        ? Utils.compressPubKey(SignerAndSignature.pubKey)
        : SignerAndSignature.pubKey.length === 64
        ? "ED" + SignerAndSignature.pubKey
        : SignerAndSignature.pubKey;

    const signerAddress = Utils.deriveAddress(pubKey);

    const txnSignature =
      Utils.getAlgorithmFromKey(pubKey) === "ed25519"
        ? SignerAndSignature.signature
        : Utils.secp256k1_p1363ToFullyCanonicalDerSignature(
            SignerAndSignature.signature
          );

    const message = Utils.encodeTransaction(
      transaction,
      signerAddress,
      definitions
    );

    // console.log({message, txnSignature, pubKey})
    const signatureVerifies = Utils.verifySignature(
      message,
      txnSignature,
      pubKey
    );
    assert(signatureVerifies, "Invalid signature by/for " + signerAddress);

    Object.assign(transaction, {
      Signers: [
        {
          Signer: {
            Account: signerAddress,
            SigningPubKey: pubKey,
            TxnSignature: txnSignature,
          },
        },
      ],
    });

    const MultiSignature = {
      signerAddress,
      signature: SignerAndSignature.signature,
      verifies: signatureVerifies,
      transaction,
      signedTransaction: Utils.encodeTransaction(
        transaction,
        undefined,
        definitions
      ),
    };

    return MultiSignature;
  });

  // console.dir(toCombine, {depth: null})
  const combined = Utils.combine(toCombine.map((c) => c.signedTransaction));
  const signedTransaction = String(
    (combined as Record<string, unknown>).signedTransaction || ""
  );

  return {
    type: "MultiSignedTx",
    txnSignature: "",
    signatureVerifies: toCombine.every((s) => s.verifies),
    txJson: decode(signedTransaction, definitions),
    signedTransaction,
    id: String((combined as Record<string, unknown>).id || ""),
  };
};

const accountAddress = (pubkey: string): string => {
  assertValidPubkey(pubkey);
  const signingPubKey = Utils.compressPubKey(pubkey);
  return Utils.deriveAddress(signingPubKey);
};

export { accountAddress, prepare, complete, completeMultiSigned };
