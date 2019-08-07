import axios from 'axios';

const config = require("config");

export class Bitsong {

    static getLastBlock(): Promise<any> {
        return axios.get(config.get("RPC") + '/status')
            .then((response) => {
                return response.data.result.sync_info.latest_block_height
            })
    }

    static getBlock(blockId: Number): Promise<any> {
        return axios.get(config.get("RPC") + '/block?height=' + blockId)
            .then((response) => {
                return response.data.result
            })
    }
}
