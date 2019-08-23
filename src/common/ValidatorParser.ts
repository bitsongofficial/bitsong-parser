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

    return null;
  }

  async parseBlock(block: number): Promise<any> {
    try {
      const bulkValidators = Validator.collection.initializeUnorderedBulkOp();
      const validatorList = await Bitsong.getValidators(block);
      const validatorSet = await Bitsong.getValidatorSet();

      if (block > 1) {
        for (var i in validatorList.validators) {
          const validatorRaw = validatorList.validators[i];
          const validatorRawData = validatorSet.find(
            v =>
              v.consensus_pubkey ===
              this.pubkeyToBech32(validatorRaw.pub_key, "bitsongvalconspub")
          );

          const validator = this.extractValidatorData(
            validatorRaw,
            validatorRawData
          );

          if (block % 10 === 0) {
            if (validator.details.description.identity) {
              winston.info("Processing profile url validators");

              const profileurl = await this.getValidatorProfileUrl(
                validator.details.description.identity
              );
              validator.details.description.profile_url = profileurl;
              console.log(validator);
            }
          } else {
            delete validator.details.description.profile_url;
          }

          bulkValidators
            .find({ consensus_pubkey: validator.details.consensusPubKey })
            .upsert()
            .updateOne({ $set: validator });
        }

        if (bulkValidators.length === 0)
          return Promise.reject(`error in validators`);

        return bulkValidators.execute().then((bulkResult: any) => {
          winston.info("Processed block validators");

          return Promise.resolve(block);
        });
      }
    } catch (err) {
      throw err;
    }
  }

  extractValidatorData(validatorRaw: any, validatorData: any): IValidator {
    if (!validatorRaw && !validatorData) return;

    return {
      address: validatorRaw.address,
      voting_power: parseInt(validatorRaw.voting_power),
      details: {
        operatorAddress: validatorData.operator_address,
        consensusPubKey: validatorData.consensus_pubkey,
        jailed: validatorData.jailed,
        status: validatorData.status,
        tokens: validatorData.tokens,
        delegatorShares: validatorData.delegator_shares,
        description: {
          moniker: validatorData.description.moniker,
          identity: validatorData.description.identity,
          website: validatorData.description.website,
          details: validatorData.description.details,
          profile_url: ""
        },
        commission: {
          rate: validatorData.commission.commission_rates.rate,
          maxRate: validatorData.commission.commission_rates.max_rate,
          maxChangeRate:
            validatorData.commission.commission_rates.max_change_rate,
          updateTime: validatorData.commission.update_time
        }
      }
    };
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
}
