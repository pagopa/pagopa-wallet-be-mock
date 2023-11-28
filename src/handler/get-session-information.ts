import { RequestHandler } from "express";
import { logger } from "../logger";
import { SessionWalletRetrieveResponse } from "../generated/wallet/SessionWalletRetrieveResponse";
import { ProblemJson } from "../generated/wallet/ProblemJson";
import { HttpStatusCode } from "../generated/wallet/HttpStatusCode";

export const error401Unauthorized = (): ProblemJson => ({
  detail: "Unauthorized",
  status: 401 as HttpStatusCode,
  title: "Unauthorized"
});

export const error400BadRequest = (): ProblemJson => ({
  detail: "Bad Reqeust",
  status: 400 as HttpStatusCode,
  title: "Invalid body request"
});

export const successResponseWithPolling = (
  orderId: string,
  walletId: string
): SessionWalletRetrieveResponse => ({
  isFinalOutcome: false,
  orderId,
  walletId
});

export const successResponseWithoutPolling = (
  orderId: string,
  walletId: string
): SessionWalletRetrieveResponse => ({
  isFinalOutcome: true,
  orderId,
  outcome: 0,
  walletId
});

export const getSessionWalletInformation: RequestHandler = async (
  _req,
  res
) => {
  const walletId = _req.params.walletId;
  const orderId = _req.params.orderId;

  logger.info(
    `[Retrieve session information from walletId ${walletId} and orderId: ${orderId}] - Return success case`
  );

  res.status(200).send(successResponseWithPolling(orderId, walletId));
};
