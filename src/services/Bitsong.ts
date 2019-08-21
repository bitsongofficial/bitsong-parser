import axios from 'axios';

const config = require("config");

export class Bitsong {

    static getLastBlock(): Promise<any> {
        return axios.get(config.get("RPC") + '/status')
            .then((response) => {
                return response.data.result.sync_info.latest_block_height
            })
    }

    static getValidators(blockHeight: Number): Promise<any> {
        return axios.get(config.get("RPC") + '/validators?height=' + blockHeight).then((response) => {
            return response.data.result
        })
    }

    static async getValidatorSet(): Promise<any> {
        let validatorSet = []

        await axios.get(config.get("LCD") + '/staking/validators').then((response) => {
            let validators = JSON.parse(JSON.stringify(response.data.result))

            for (var i in validators) {
                let validator = validators[i]

                validatorSet[validator.consensus_pubkey] = validator
            }
        })

        await axios.get(config.get("LCD") + '/staking/validators?status=unbonded').then((response) => {
            let validators = JSON.parse(JSON.stringify(response.data.result))

            for (var i in validators) {
                let validator = validators[i]

                validatorSet[validator.consensus_pubkey] = validator
            }
        })

        await axios.get(config.get("LCD") + '/staking/validators?status=unbonded').then((response) => {
            let validators = JSON.parse(JSON.stringify(response.data.result))

            for (var i in validators) {
                let validator = validators[i]

                validatorSet[validator.consensus_pubkey] = validator
            }
        })

        return Promise.all([validatorSet]);
    }

    static getBlock(blockId: Number): Promise<any> {
        return axios.get(config.get("RPC") + '/block?height=' + blockId)
            .then((response) => {
                return response.data.result
            })
    }

    static getTxsByBlock(blockId: Number): Promise<any> {
        return axios.get(config.get("RPC") + '/tx_search?query="tx.height=' + blockId + '"')
            .then((response) => {
                return response.data.result.txs
            })
    }

    static getTxByHash(hash: String): Promise<any> {
        return axios.get(config.get("LCD") + '/txs/' + hash)
            .then((response) => {
                return response.data
            })
    }
}
