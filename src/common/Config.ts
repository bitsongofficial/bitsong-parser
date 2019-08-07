const config = require("config");

export class Config {
        static network = config.get("RPC");
}