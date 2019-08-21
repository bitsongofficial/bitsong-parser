import * as winston from "winston";
import * as bech32 from "bech32"
import { Validator } from "../models/ValidatorModel";
import { ValidatorSet } from "../models/ValidatorSetModel";
import { ValidatorRecord } from "../models/ValidatorRecordModel";
import { IValidator } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong"
import { getAddress } from 'tendermint/lib/pubkey';

export class ValidatorParser {
    public pubkeyToBech32(pubkey, prefix = 'bitsongpub') {
        // '1624DE6420' is ed25519 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex')
        let buffer = Buffer.alloc(37)
        pubkeyAminoPrefix.copy(buffer, 0)
        Buffer.from(pubkey.value, 'base64').copy(buffer, pubkeyAminoPrefix.length)
        return bech32.encode(prefix, bech32.toWords(buffer))
    }

    public async parseValidators(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        blocks.map(async (block: any) => {
            const blockHeight = block.block.header.height
            const precommits = block.block.last_commit.precommits;
            
            const validatorList = await Bitsong.getValidators(blockHeight)
            validatorList.block_height = parseInt(validatorList.block_height);

            const validatorSet = await Bitsong.getValidatorSet()

            const bulkValidators = Validator.collection.initializeUnorderedBulkOp();
            
            const bulkValidatorSets = ValidatorSet.collection.initializeUnorderedBulkOp();
            bulkValidatorSets.find({block_height: blockHeight}).upsert().replaceOne(validatorList)
            if (bulkValidatorSets.length === 0) return Promise.resolve();
            bulkValidatorSets.execute()

            const bulkValidatorRecords = ValidatorRecord.collection.initializeUnorderedBulkOp();

            if (blockHeight > 1) {
                let records = {
                    height: blockHeight,
                    validators: []
                }

                for (var i in validatorList.validators) {
                    let validator = validatorList.validators[i]

                    validator.voting_power = parseInt(validator.voting_power);
                    validator.proposer_priority = parseInt(validator.proposer_priority)
                    Validator.findOne({"pub_key.value": validator.pub_key.value}).then((valExist: any) => {
                        if (!valExist) {
                            console.log(`validator pub_key ${validator.address} ${validator.pub_key.value} not in db`);

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
                            }

                            bulkValidators.find({consensus_pubkey: validator.consensus_pubkey}).upsert().updateOne({$set:validator});
                        } else {
                            let validatorData = validatorSet[0][valExist.consensus_pubkey]
                            if (validatorData) {
                                validator.jailed = validatorData.jailed;
                                validator.status = validatorData.status;
                                validator.tokens = validatorData.tokens;
                                validator.delegator_shares = validatorData.delegator_shares;
                                validator.description = validatorData.description;
                                validator.bond_height = validatorData.bond_height;
                                validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                                validator.unbonding_height = validatorData.unbonding_height;
                                validator.unbonding_time = validatorData.unbonding_time;
                                validator.commission = validatorData.commission;

                                // TODO: calculate self delegation percentage every 30 blocks

                                bulkValidators.find({consensus_pubkey: validator.consensus_pubkey}).upsert().updateOne({$set:validator});
                            }
                        }

                        if (bulkValidators.length > 0) {
                            bulkValidators.execute()
                        }
                    })

                    

                    let address = validatorList.validators[i].address;
    
                    let record = {
                        address: address,
                        exists: false,
                        voting_power: parseInt(validatorList.validators[i].voting_power)
                    }

                    for (var j in precommits) {
                        if (precommits[j] != null) {
                            if (address == precommits[j].validator_address) {
                                record.exists = true
                                precommits.splice(j, 1)
                                break;
                            }
                        }
                    }

                    records.validators.push(record)
                }

                bulkValidatorRecords.find({height: blockHeight}).upsert().replaceOne(records)
                bulkValidatorRecords.execute()
            }
        })

        return Promise.resolve(blocks);       
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