import * as winston from "winston";
import { Validator } from "../models/ValidatorModel";
import { IValidator } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong"

export class ValidatorParser {
    public async parseValidators(blocks: any) {
        await Bitsong.getValidators().then((validator: any) => {
            console.log(validator)
        })
    }
}