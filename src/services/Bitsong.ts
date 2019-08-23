import axios from "axios";
import fetch from "isomorphic-fetch";

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
    let validatorSet = [];

    const validators = await axios
      .get(`${config.get("LCD")}/staking/validators`)
      .then(res => JSON.parse(JSON.stringify(res.data.result)));

    const validatorsUnbonded = await axios
      .get(`${config.get("LCD")}/staking/validators?status=unbonded`)
      .then(res => JSON.parse(JSON.stringify(res.data.result)));

    const validatorsUnbonding = await axios
      .get(`${config.get("LCD")}/staking/validators?status=unbonding`)
      .then(res => JSON.parse(JSON.stringify(res.data.result)));

    for (var i in validators) {
      validatorSet[validators[i].consensus_pubkey] = validators[i];
    }

    for (var i in validatorsUnbonded) {
      validatorSet[validatorsUnbonded[i].consensus_pubkey] =
        validatorsUnbonded[i];
    }

    for (var i in validatorsUnbonding) {
      validatorSet[validatorsUnbonding[i].consensus_pubkey] =
        validatorsUnbonded[i];
    }

    return validatorSet;
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
