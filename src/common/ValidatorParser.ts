import * as winston from "winston";
import * as bech32 from "bech32"
import axios from 'axios';
import { Validator } from "../models/ValidatorModel";
import { ValidatorSet } from "../models/ValidatorSetModel";
import { ValidatorRecord } from "../models/ValidatorRecordModel";
import { IValidator } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong"
import { getAddress } from 'tendermint/lib/pubkey';
import * as BluebirdPromise from "bluebird";

export class ValidatorParser {
    public pubkeyToBech32(pubkey, prefix = 'bitsongpub'): any {
        // '1624DE6420' is ed25519 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex')
        let buffer = Buffer.alloc(37)
        pubkeyAminoPrefix.copy(buffer, 0)
        Buffer.from(pubkey.value, 'base64').copy(buffer, pubkeyAminoPrefix.length)
        return bech32.encode(prefix, bech32.toWords(buffer))
    }

    public getValidatorProfileUrl(identity: string): any {
        if (identity.length == 16) {
            return axios.get(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`).then((response) => {
                if (response.status === 200) {
                    let them = response.data.them
                    return them && them.length && them[0].pictures && them[0].pictures.primary && them[0].pictures.primary.url;
                }
            })
        }

        //return Promise.resolve()
    }

    getValidators(blockHeight): Promise<any[]> {
        const validatorList = Bitsong.getValidators(blockHeight)
        const validatorSet = Bitsong.getValidatorSet()
        return Promise.all([validatorList, validatorSet]);
    }



    parseBlock(block: number): Promise<any> {
        const bulkValidators = Validator.collection.initializeUnorderedBulkOp();

        const promises = [this.getValidators(block)]

        return Promise.all(promises).then(async (res) => {
          const validatorList = res[0][0]
          const validatorSet = res[0][1]

          if (block > 1) {
              for (var i in validatorList.validators) {
                let validator = validatorList.validators[i]

                validator.voting_power = parseInt(validator.voting_power);
                validator.proposer_priority = parseInt(validator.proposer_priority)

                validator.address = getAddress(validator.pub_key)
                validator.accpub = this.pubkeyToBech32(validator.pub_key, 'bitsongpub')
                validator.operator_pubkey = this.pubkeyToBech32(validator.pub_key, 'bitsongvaloperpub')
                validator.consensus_pubkey = this.pubkeyToBech32(validator.pub_key, 'bitsongvalconspub')

                let validatorData = validatorSet[0][validator.consensus_pubkey]
                if (validatorData) {
                    validator.operator_address = validatorData.operator_address;
                    //validator.delegator_address = Meteor.call('getDelegator', validatorData.operator_address);
                    validator.jailed = validatorData.jailed;
                    validator.status = validatorData.status;
                    validator.min_self_delegation = validatorData.min_self_delegation;
                    validator.tokens = validatorData.tokens;
                    validator.delegator_shares = validatorData.delegator_shares;
                    validator.description = validatorData.description;
                    validator.bond_height = validatorData.bond_height;
                    validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                    validator.unbonding_height = validatorData.unbonding_height;
                    validator.unbonding_time = validatorData.unbonding_time;
                    validator.commission = validatorData.commission;
                    validator.self_delegation = validator.delegator_shares;

                    bulkValidators.find({consensus_pubkey: validator.consensus_pubkey}).upsert().updateOne({$set:validator});
                }
              }
          }

          if (bulkValidators.length === 0) return Promise.reject(`error in validators`)

          return bulkValidators.execute().then((bulkResult: any) => {
              winston.info("Processed block validators");

              return Promise.resolve({block, validatorSet});
          }).then(async (response: any) => {
            const block = response.block
            const validators = response.validatorSet[0]

            // update profile pic each 720 blocks ~1h
            if (block % 720 === 0) {
              winston.info("Processing profile url validators");

              for (var i in validators) {
                const validator = validators[i]
                if (validator.description.identity) {
                  const profileurl = await this.getValidatorProfileUrl(validator.description.identity)
                  validator.profile_url = profileurl
                  bulkValidators.find({consensus_pubkey: validator.consensus_pubkey}).upsert().updateOne({$set:validator});
                }
              }

              if (bulkValidators.length > 0) {
                return bulkValidators.execute().then((bulkResult: any) => {
                    winston.info("Processed profile urls validators");

                    return Promise.resolve({block, validatorSet});
                })
              }

            }
          })
        }).catch(error => console.error(error))
    }

    public async parseValidators(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const promises = blocks.map((block, i) => {
          const blockHeight = block.block.header.height

          return this.parseBlock(blockHeight)
        })

        return Promise.all(promises).then((res: any) => {
          return blocks
        })
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
