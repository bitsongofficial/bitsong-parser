import axios from 'axios';

const config = require("config");

export class Bitsong {

    static getLastBlock(): Promise<any> {
        return axios.get(config.get("RPC") + '/status')
            .then((response) => {
                return response.data.result.sync_info.latest_block_height
            })
    }

    static getValidators(): Promise<any> {
        let validatorSet = {}
        let res = axios.get(config.get("LCD") + '/staking/validators').then((response) => {
            //JSON.parse(JSON.stringify(response.data.result)).forEeach((validator) => console.log(validator))  
            

            let validators = JSON.stringify(response.data.result)
            let validator2 = JSON.parse(validators)
            validator2.forEeach((val) => console.log(val))
            //console.log(validator2)
        })
        
        console.log(validatorSet)
        return res
        /*return axios.get(config.get("LCD") + '/staking/validators')
            .then((response) => {
                return response.data.result.sync_info.latest_block_height
            })*/
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
