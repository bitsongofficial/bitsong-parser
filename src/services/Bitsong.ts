import axios from "axios";

const config = require("config");

export class Bitsong {
  static async getGenesis(): Promise<any> {
    return await axios.get(`${config.get("RPC")}/genesis`).then(response => {
      return response.data.result.genesis;
    });
  }

  static getLastBlock(): Promise<any> {
    return axios.get(config.get("RPC") + "/status").then(response => {
      return parseInt(response.data.result.sync_info.latest_block_height);
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

  static async getBalances(address: String): Promise<any> {
    // Balance Available: http://lcd.testnet-2.bitsong.network/bank/balances/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le
    // Balance Delegations: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/delegations
    // Balance Unbonding: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/unbonding_delegations
    // Balance Rewards: http://lcd.testnet-2.bitsong.network/distribution/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/rewards
    // Balance Commission (only validators): http://lcd.testnet-2.bitsong.network/distribution/validators/bitsongvaloper18p62z98hrn6h9qyqem7kxy04l8u7a4yv9tc3re/rewards
    return Promise.all([
      axios.get(`${config.get("LCD")}/bank/balances/${address}`),
      axios.get(
        `${config.get("LCD")}/staking/delegators/${address}/delegations`
      ),
      axios.get(
        `${config.get(
          "LCD"
        )}/staking/delegators/${address}/unbonding_delegations`
      ),
      axios.get(
        `${config.get("LCD")}/distribution/delegators/${address}/rewards`
      )
    ]).then(balances => {
      let available_balance = 0;
      if (balances[0].data.result[0]) {
        available_balance = parseFloat(balances[0].data.result[0].amount);
      }
      let delegations_balance = 0;
      const delegations = balances[1].data.result;
      delegations.forEach(delegation => {
        delegations_balance += parseFloat(delegation.balance.amount);
      });
      let unbondig_balance = 0;
      const unbongings = balances[2].data.result;
      unbongings.forEach(unbondig_balance => {
        unbondig_balance += parseFloat(unbondig_balance.balance.amount);
      });
      let rewards_balance = 0;
      if (balances[3].data.result.total !== null) {
        if (balances[3].data.result.total.length > 0) {
          rewards_balance = parseFloat(balances[3].data.result.total[0].amount);
        }
      }
      const total_balance =
        available_balance +
        delegations_balance +
        unbondig_balance +
        rewards_balance;
      return {
        available: available_balance,
        delegations: delegations_balance,
        unbonding: unbondig_balance,
        rewards: rewards_balance,
        commissions: 0,
        total: total_balance
      };
      // [].concat(
      //   ...validatorGroups[0].data.result,
      //   ...validatorGroups[1].data.result,
      //   ...validatorGroups[2].data.result
      // )
    });
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
