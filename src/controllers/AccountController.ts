import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Account } from "../models/AccountModel";
import * as xss from "xss-filters";

export class AccountController {
  private defaultLimit: number = 25;
  private maxLimit: number = 50;

  public readAllAccounts = (req: Request, res: Response) => {
    // validate query input
    const validationErrors: any = AccountController.validateQueryParameters(
      req
    );
    if (validationErrors) {
      sendJSONresponse(res, 400, validationErrors);
      return;
    }

    // extract query parameters
    const queryParams = this.extractQueryParameters(req);

    // build up query
    const query: any = {};

    Account.paginate(query, {
      page: queryParams.page,
      limit: queryParams.limit
    })
      .then((accounts: any) => {
        sendJSONresponse(res, 200, accounts);
      })
      .catch((err: Error) => {
        sendJSONresponse(res, 404, err);
      });
  };

  private static validateQueryParameters(req: Request) {
    req
      .checkQuery("page", "Page needs to be a number")
      .optional()
      .isNumeric();
    req
      .checkQuery("limit", "limit needs to be a number")
      .optional()
      .isNumeric();

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

    return {
      page: page,
      limit
    };
  }
}
