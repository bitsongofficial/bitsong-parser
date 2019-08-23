import * as winston from "winston";
import * as bech32 from "bech32";
import axios from "axios";
import { Validator } from "../models/ValidatorModel";
import { IValidator } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong";
import { getAddress } from "tendermint/lib/pubkey";
import * as BluebirdPromise from "bluebird";
import {sha256} from "js-sha256";

const config = require("config");

export class ValidatorParser {
  public pubkeyToBech32(pubkey, prefix = "bitsongpub"): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.alloc(37);
    pubkeyAminoPrefix.copy(buffer, 0);
    Buffer.from(pubkey.value, "base64").copy(buffer, pubkeyAminoPrefix.length);
    return bech32.encode(prefix, bech32.toWords(buffer));
  }

  public bech32PubkeyToAddress(pubkey): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex')
    let buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
    let test = buffer.slice(pubkeyAminoPrefix.length).toString('base64');
    return sha256(Buffer.from(test, 'base64')).substring(0, 40).toUpperCase()
  }

  public bech32ToPubKey(pubkey): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex')
    let buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
    return buffer.slice(pubkeyAminoPrefix.length).toString('base64');
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
    if (block < 1) return Promise.resolve();

    try {
      const bulkValidators = Validator.collection.initializeUnorderedBulkOp();
      const validatorList = await Bitsong.getValidators(block);

      for (var i in validatorList.validators) {
        validatorList.validators[i].pub_key.bech32 = this.pubkeyToBech32(validatorList.validators[i].pub_key, "bitsongvalconspub")
      }

      const validatorSet = await Bitsong.getValidatorSet();

      for (const validatorRawData of validatorSet) {
        const validatorRaw = validatorList.validators.find(v => v.pub_key.bech32 === validatorRawData.consensus_pubkey)
        const validator = this.extractValidatorData(
          validatorRaw,
          validatorRawData
        );

        if (block % parseInt(config.get("PARSER.UPDATE_VALIDATOR_PIC_DELAY")) === 0) {
          if (validator.details.description.identity) {
            winston.info("Processing profile url validators");
            
            const profileurl = await this.getValidatorProfileUrl(
              validator.details.description.identity
            );

            bulkValidators.find({"details.consensusPubKey": validator.details.consensusPubKey}).updateOne({"$set": {"details.description.profile_url": profileurl}});
          }
        }

        bulkValidators
          .find({"details.consensusPubKey": validator.details.consensusPubKey})
          .upsert()
          .updateOne({"$set": {
            "address": validator.address,
            "voting_power": validator.voting_power,
            "proposer_priority": validator.proposer_priority,
            "details.operatorAddress": validator.details.operatorAddress,
            "details.consensusPubKey": validator.details.consensusPubKey,
            "details.jailed": validator.details.jailed,
            "details.status": validator.details.status,
            "details.tokens": validator.details.tokens,
            "details.delegatorShares": validator.details.delegatorShares,
            "details.description.moniker": validator.details.description.moniker,
            "details.description.identity": validator.details.description.identity,
            "details.description.website": validator.details.description.website,
            "details.description.details": validator.details.description.details,
            "details.commission.rate": validator.details.commission.rate,
            "details.commission.maxRate": validator.details.commission.maxRate,
            "details.commission.maxChangeRate": validator.details.commission.maxChangeRate,
            "details.commission.updateTime": validator.details.commission.updateTime,
          }});
      }

      if (bulkValidators.length === 0)
        return Promise.reject(`error in validators`);

      return await bulkValidators.execute()
    } catch (err) {
      throw err;
    }
  }

  extractValidatorData(validatorRaw: any, validatorData: any) {
    return {
      address: typeof validatorRaw !== 'undefined' ? validatorRaw.address : this.bech32PubkeyToAddress(validatorData.consensus_pubkey),
      voting_power: typeof validatorRaw !== 'undefined' ? parseInt(validatorRaw.voting_power) : 0,
      proposer_priority: typeof validatorRaw !== 'undefined' ? parseInt(validatorRaw.proposer_priority) : 0,
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
          details: validatorData.description.details
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
