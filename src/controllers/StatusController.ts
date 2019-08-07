import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";

export class StatusController {
    public getStatus(req: Request, res: Response) {
        sendJSONresponse(res, 200, {
            status: 'ok'
        });
    }
}