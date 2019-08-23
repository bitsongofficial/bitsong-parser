import * as winston from "winston";
import * as bech32 from "bech32";
import axios from "axios";
import { Validator } from "../models/ValidatorModel";
import { IValidator } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong";
import { getAddress } from "tendermint/lib/pubkey";
import * as BluebirdPromise from "bluebird";

export class ValidatorParser {
  public pubkeyToBech32(pubkey, prefix = "bitsongpub"): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.alloc(37);
    pubkeyAminoPrefix.copy(buffer, 0);
    Buffer.from(pubkey.value, "base64").copy(buffer, pubkeyAminoPrefix.length);
    return bech32.encode(prefix, bech32.toWords(buffer));
  }

  public getValidatorProfileUrl(identity: string): Promise<any> {
    if (identity.length == 16) {
      return axios
        .get(
          `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`
        )
        .then(response => {
          if (response.status === 200) {
            let them = response.data.them;
            return (
              them &&
              them.length &&
              them[0].pictures &&
              them[0].pictures.primary &&
              them[0].pictures.primary.url
            );
          }
        });
    }
  }

  async parseBlock(block: number): Promise<any> {
    try {
      const bulkValidators = Validator.collection.initializeUnorderedBulkOp();
      const validatorList = await Bitsong.getValidators(block);
      const validatorSet = await Bitsong.getValidatorSet();
      console.log(validatorSet);
    } catch (err) {
      throw err;
    }
  }

  public async parseValidators(blocks: any) {
    if (blocks.length === 0) return Promise.resolve();

    const promises = blocks.map((block, i) => {
      const blockHeight = block.block.header.height;

      return this.parseBlock(blockHeight);
    });

    return Promise.all(promises).then((res: any) => {
      return blocks;
    });
  }

  extractValidatorData(blockNumber: Number, validator: any) {
    return {
      height: blockNumber,
      address: validator.address,
      exists: false,
      voting_power: Number(parseInt(validator.voting_power))
    };
  }
}
