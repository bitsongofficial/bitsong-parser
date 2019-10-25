import axios from "axios";
import * as bech32 from "bech32";
import * as CryptoJS from "crypto-js";

const config = require("config");

export class Sdk {
  static bech32ify(address, prefix) {
    const words = bech32.toWords(Buffer.from(address, "hex"));
    return bech32.encode(prefix, words);
  }

  static pubkeyUserToBech32 = (pubkey, prefix) => {
    const message = CryptoJS.enc.Hex.parse(
      Buffer.from(pubkey, "base64").toString("hex")
    );
    const address = CryptoJS.RIPEMD160(CryptoJS.SHA256(message)).toString();
    return Sdk.bech32ify(address, prefix);
  };

  static operatorAddrToAccoutAddr = (operatorAddr, prefix) => {
    const address = bech32.decode(operatorAddr);
    return bech32.encode(prefix, address.words);
  };

  static pubkeyToBech32 = (pubkey, prefix) => {
    // '1624DE6420' is ed25519 pubkey prefix
    let pubkeyAminoPrefix = Buffer.from("1624DE6420", "hex");
    let buffer = Buffer.alloc(37);
    pubkeyAminoPrefix.copy(buffer, 0);
    Buffer.from(pubkey.value, "base64").copy(buffer, pubkeyAminoPrefix.length);
    return bech32.encode(prefix, bech32.toWords(buffer));
  };

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

  static async getValidators(blockHeight: Number) {
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
