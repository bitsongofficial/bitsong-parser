import { Response } from "express";
import * as winston from "winston";
import { Config } from "./Config";
const axios = require("axios");

/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
export function sendJSONresponse(res: Response, status: number, content: any) {
    res.status(status);
    res.json(content);
}

/**
 * Sets delay for given amount of time.
 *
 * @param {number} t
 * @returns {Promise<any>}
 */
export function setDelay(t: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, t);
    });
}

interface Array<T> {
    flatMap<E>(callback: (t: T) => Array<E>): Array<E>
}

Object.defineProperty(Array.prototype, "flatMap", {
    value: function(f: Function) {
        return this.reduce((ys: any, x: any) => {
            return ys.concat(f.call(this, x))
        }, [])
    },
    enumerable: false,
})