import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Block } from "../models/BlockModel";
import * as xss from "xss-filters";

export class BlockController {

    private defaultLimit: number = 25;
    private maxLimit: number = 50;

    public readAllBlocks = (req: Request, res: Response) => {
        // validate query input
        const validationErrors: any = BlockController.validateQueryParameters(req);
        if (validationErrors) {
            sendJSONresponse(res, 400, validationErrors);
            return;
        }

        // extract query parameters
        const queryParams = this.extractQueryParameters(req);
        
        // build up query
        const query: any = {};
        
        query.height = { "$gte": queryParams.startBlock, "$lte": queryParams.endBlock};

        Block.paginate(query, {
            page: queryParams.page,
            limit: queryParams.limit,
            sort: {time: -1},
        }).then((blocks: any) => {
            sendJSONresponse(res, 200, blocks);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });

    }

    private static validateQueryParameters(req: Request) {
        req.checkQuery("page", "Page needs to be a number").optional().isNumeric();
        req.checkQuery("startBlock", "startBlock needs to be a number").optional().isNumeric();
        req.checkQuery("endBlock", "endBlock needs to be a number").optional().isNumeric();
        req.checkQuery("limit", "limit needs to be a number").optional().isNumeric();

        return req.validationErrors();
    }

    private extractQueryParameters(req: Request) {
        // page parameter
        let page = parseInt(xss.inHTMLData(req.query.page));
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // limit parameter
        let limit = parseInt(xss.inHTMLData(req.query.limit));
        if (isNaN(limit)) {
            limit = this.defaultLimit;
        } else if (limit > this.maxLimit) {
            limit = this.maxLimit;
        } else if (limit < 1) {
            limit = 1;
        }

        // start block parameter
        let startBlock = parseInt(xss.inHTMLData(req.query.startBlock));
        if (isNaN(startBlock) || startBlock < 1) {
            startBlock = 1;
        }

        // end block parameter
        let endBlock = parseInt(xss.inHTMLData(req.query.endBlock));
        if (isNaN(endBlock) || endBlock < 1 || endBlock < startBlock) {
            endBlock = 9999999999;
        }

        return {
            startBlock: startBlock,
            endBlock: endBlock,
            page: page,
            limit
        };
    }

}