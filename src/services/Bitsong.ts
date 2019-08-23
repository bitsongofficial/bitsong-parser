import axios from "axios";

const config = require("config");

export class Bitsong {
  static getLastBlock(): Promise<any> {
    return axios.get(config.get("RPC") + "/status").then(response => {
      return response.data.result.sync_info.latest_block_height;
    });
  }

  static async getValidators(blockHeight: Number): Promise<any> {
    const validators = await axios
      .get(`${config.get("RPC")}/validators?height=${blockHeight}`)
      .then(res => JSON.parse(JSON.stringify(res.data.result)));

    return validators;
  }

  static async getValidatorSet(): Promise<any> {
    return Promise.all([
      axios.get(`${config.get("LCD")}/staking/validators`),
      axios.get(`${config.get("LCD")}/staking/validators?status=unbonded`),
      axios.get(`${config.get("LCD")}/staking/validators?status=unbonding`)
    ]).then(validatorGroups =>
      [].concat(
        ...validatorGroups[0].data.result,
        ...validatorGroups[1].data.result,
        ...validatorGroups[2].data.result
      )
    );
  }

  static getBlock(blockId: Number): Promise<any> {
    return axios
      .get(config.get("RPC") + "/block?height=" + blockId)
      .then(response => {
        return response.data.result;
      });
  }

  static getTxsByBlock(blockId: Number): Promise<any> {
    return axios
      .get(config.get("RPC") + '/tx_search?query="tx.height=' + blockId + '"')
      .then(response => {
        return response.data.result.txs;
      });
  }

  static getTxByHash(hash: String): Promise<any> {
    return axios.get(config.get("LCD") + "/txs/" + hash).then(response => {
      return response.data;
    });
  }
}
