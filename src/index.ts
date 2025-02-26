/* Methods ================================================================== */
import * as generate from "./generate";
import * as derive from "./derive";
import * as utils from "./utils";
import { sign, signAndSubmit, prefilledSignAndSubmit } from "./sign";
import * as rawSigning from "./rawSigning";

/* Types ==================================================================== */
import XRPL_Account from "./schema/Account";

/* Client =================================================================== */
import { XrplClient } from "xrpl-client";

/* All Libs ================================================================= */
import * as rippleAddressCodec from "@xhbmygod/ripple-address-codec";
import * as rippleKeypairs from "@xhbmygod/ripple-keypairs";
import * as rippleSecretCodec from "@xhbmygod/ripple-secret-codec";
import * as xrplBinaryCodecPrerelease from "@xhbmygod/ripple-binary-codec";

/* Defs ===================================================================== */
import {
  XrplDefinitions,
  encode,
  decode,
  encodeForSigning,
  encodeForMultisigning,
  encodeForSigningClaim,
  nativeAsset,
} from "@xhbmygod/ripple-binary-codec";
import DEFAULT_DEFINITIONS from '@xhbmygod/ripple-binary-codec/dist/enums/definitions.json';
import { type DefinitionsData } from "@xhbmygod/ripple-binary-codec/dist/enums/xrpl-definitions-base";

const binary = {
  encode,
  decode,
  encodeForSigning,
  encodeForMultisigning,
  encodeForSigningClaim,
  DEFAULT_DEFINITIONS
};

const libraries: {
      rippleAddressCodec: typeof rippleAddressCodec,
    rippleKeypairs: typeof rippleKeypairs,
    rippleSecretCodec: typeof rippleSecretCodec,
    xrplBinaryCodecPrerelease: typeof xrplBinaryCodecPrerelease
    rippleBinaryCodec: typeof xrplBinaryCodecPrerelease
} = {
  rippleAddressCodec,
  rippleKeypairs,
  rippleSecretCodec,
  xrplBinaryCodecPrerelease,
  rippleBinaryCodec: xrplBinaryCodecPrerelease,
};

/* Export ==================================================================== */
export {
  XRPL_Account,
  generate,
  derive,
  sign,
  signAndSubmit,
  prefilledSignAndSubmit,
  utils,
  rawSigning,
  XrplDefinitions,
  binary,
  XrplClient,
  nativeAsset,
  libraries,
};

export type { DefinitionsData };
