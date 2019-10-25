import * as winston from "winston";
import * as bech32 from "bech32";
import axios from "axios";
import { Validator } from "../models/ValidatorModel";
import { MissedBlock } from "../models/MissedBlockModel";
import { Account } from "../models/AccountModel";
import { IValidator } from "./CommonInterfaces";
import { Sdk } from "../services/Sdk";
import { getAddress } from "tendermint/lib/pubkey";
import * as BluebirdPromise from "bluebird";
import { sha256 } from "js-sha256";

const config = require("config");

export class ValidatorParser {
  public pubkeyToBech32(pubkey, prefix): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.alloc(37);
    pubkeyAminoPrefix.copy(buffer, 0);
    Buffer.from(pubkey.value, "base64").copy(buffer, pubkeyAminoPrefix.length);
    return bech32.encode(prefix, bech32.toWords(buffer));
  }

  public bech32PubkeyToAddress(pubkey): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
    let test = buffer.slice(pubkeyAminoPrefix.length).toString("base64");
    return sha256(Buffer.from(test, "base64"))
      .substring(0, 40)
      .toUpperCase();
  }

  public bech32ToPubKey(pubkey): any {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
    return buffer.slice(pubkeyAminoPrefix.length).toString("base64");
  }

  public getDelegatorAddress(operatorAddr, prefix): any {
    const address = bech32.decode(operatorAddr);
    return bech32.encode(prefix, address.words);
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

  public async parseGenesisValidators() {
    try {
      const genesis = await Sdk.getGenesis();
      const validators = await genesis.app_state.genutil.gentxs.map(
        async (validator: any) => {
          const msg = validator.value.msg.find(
            m => m.type === "cosmos-sdk/MsgCreateValidator"
          );

          await Validator.findOneAndUpdate(
            { consensus_pubkey: msg.value.pubkey },
            {
              $set: {
                operator_address: msg.value.validator_address,
                delegator_address: msg.value.delegator_address,
                consensus_pubkey: msg.value.pubkey,
                jailed: false,
                status: 2,
                "description.moniker": msg.value.description.moniker,
                "description.identity": msg.value.description.identity,
                "description.website": msg.value.description.website,
                "description.security_contact":
                  msg.value.description.security_contact,
                "description.details": msg.value.description.details,
                "commission.commission_rates.rate": msg.value.commission.rate,
                "commission.commission_rates.max_rate":
                  msg.value.commission.max_rate,
                "commission.commission_rates.max_change_rate":
                  msg.value.commissionmax_change_rate
              }
            },
            { upsert: true, new: true }
          ).exec();
        }
      );

      winston.info("Processed validators from genesis.");

      return Promise.all(validators);
    } catch (error) {
      winston.error(`Could not parse genesis validators with error: ${error}`);
    }
  }

  async parseBlock(block: any): Promise<any> {
    if (block < 1) return Promise.resolve();

    try {
      const bulkValidators = Validator.collection.initializeUnorderedBulkOp();
      const validatorSet = await Sdk.getValidatorSet();

      for (const validatorRaw of validatorSet) {
        const validator = this.extractValidatorData(validatorRaw);

        // // Update validator picture
        // if (
        //   block % parseInt(config.get("PARSER.UPDATE_VALIDATOR_PIC_DELAY")) ===
        //   0
        // ) {
        //   if (validator.details.description.identity) {
        //     winston.info("Processing profile url validators");

        //     const profileurl = await this.getValidatorProfileUrl(
        //       validator.details.description.identity
        //     );

        //     bulkValidators
        //       .find({
        //         "details.consensusPubkey": validator.details.consensusPubkey
        //       })
        //       .updateOne({
        //         $set: { "details.description.profile_url": profileurl }
        //       });
        //   }
        // }

        bulkValidators
          .find({
            consensus_pubkey: validator.consensus_pubkey
          })
          .upsert()
          .updateOne({
            $set: {
              address: validator.address,
              operator_address: validator.operator_address,
              delegator_address: validator.delegator_address,
              consensus_pubkey: validator.consensus_pubkey,
              jailed: validator.jailed,
              status: validator.status,
              tokens: validator.tokens,
              delegator_shares: validator.delegator_shares,
              "description.moniker": validator.description.moniker,
              "description.identity": validator.description.identity,
              "description.website": validator.description.website,
              "description.details": validator.description.details,
              "description.security_contact":
                validator.description.security_contact,
              unbonding_height: validator.unbonding_height,
              unbonding_time: validator.unbonding_time,
              "commission.commission_rates.rate":
                validator.commission.commission_rates.rate,
              "commission.commission_rates.max_rate":
                validator.commission.commission_rates.max_rate,
              "commission.commission_rates.max_change_rate":
                validator.commission.commission_rates.max_change_rate,
              "commission.update_time": validator.commission.update_time,
              min_self_delegation: validator.min_self_delegation
            }
          });
      }

      if (bulkValidators.length === 0)
        return Promise.reject(`error in validators`);

      return await bulkValidators.execute();
    } catch (err) {
      throw err;
    }
  }

  extractValidatorData(validatorData: any) {
    return {
      address: this.bech32PubkeyToAddress(validatorData.consensus_pubkey),
      operator_address: validatorData.operator_address,
      delegator_address: this.getDelegatorAddress(
        validatorData.operator_address,
        config.get("bech32PrefixAccAddr")
      ),
      consensus_pubkey: validatorData.consensus_pubkey,
      jailed: validatorData.jailed,
      status: validatorData.status,
      tokens: validatorData.tokens,
      delegator_shares: validatorData.delegator_shares,
      description: {
        moniker: validatorData.description.moniker,
        identity: validatorData.description.identity,
        website: validatorData.description.website,
        details: validatorData.description.details,
        security_contact: validatorData.description.security_contact
      },
      unbonding_height: validatorData.unbonding_height,
      unbonding_time: validatorData.unbonding_time,
      commission: {
        commission_rates: {
          rate: validatorData.commission.commission_rates.rate,
          max_rate: validatorData.commission.commission_rates.max_rate,
          max_change_rate:
            validatorData.commission.commission_rates.max_change_rate
        },
        update_time: validatorData.commission.update_time
      },
      min_self_delegation: validatorData.min_self_delegation
    };
  }

  async updateMissingValidators(block: any): Promise<any> {
    let block_height = block.block.header.height;
    if (block_height < 2) return Promise.resolve();

    block_height = block_height - 1;

    try {
      const bulkMissedBlocks = [];
      // find active validators
      const validators = await Validator.find({});
      const activeValidators = await Sdk.getValidators(block_height);
      const precommits = block.block.last_commit.precommits;

      activeValidators.validators.map(async validator => {
        const precommit = precommits.find(
          p => p && p.validator_address === validator.address
        );

        const validatorDb = validators.find(
          v => v.address === validator.address
        );

        if (precommit === undefined) {
          bulkMissedBlocks.push({
            updateOne: {
              filter: { height: Number(block_height) },
              update: {
                $push: { validators: validatorDb._id }
              },
              upsert: true
            }
          });
        }
      });

      let active_validators = activeValidators.validators.length;

      if (bulkMissedBlocks.length >= 1) {
        active_validators =
          activeValidators.validators.length - bulkMissedBlocks.length;

        winston.info(
          `${bulkMissedBlocks.length}/${activeValidators.validators.length} validators missing precommit, block ${block_height}`
        );
      } else {
        winston.info(
          `${active_validators} active validators, block ${block_height}`
        );
      }

      bulkMissedBlocks.push({
        updateOne: {
          filter: { height: Number(block_height) },
          update: {
            $set: {
              created_at: block.block_meta.header.time,
              active_validators: active_validators,
              total_validators: activeValidators.validators.length
            }
          },
          upsert: true
        }
      });

      return MissedBlock.collection.bulkWrite(bulkMissedBlocks, {
        orderd: true,
        w: 1
      });
    } catch (err) {
      winston.error(
        `Could not update validators block ${block.block_meta.header.height} with error: ${err}`
      );
    }
  }

  public async parseValidators(blocks: any) {
    if (blocks.length === 0) return Promise.resolve();

    const blocksToParse = blocks.map(async block => {
      const blockHeight = block.block.header.height;
      await this.parseBlock(blockHeight);

      // Update missing validators
      await this.updateMissingValidators(block);

      return block;
    });

    return Promise.all(blocksToParse);
  }
}
