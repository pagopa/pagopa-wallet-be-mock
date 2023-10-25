import { pipe } from "fp-ts/lib/function";
import { v4 as uuid } from "uuid";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { RequestHandler } from "express";
import { config } from "../config";
import { logger } from "../logger";
import { getSessionIdCookie } from "../utils";
import { WalletVerifyRequestsResponse } from "../generated/wallet/WalletVerifyRequestsResponse";
import { WalletVerifyRequestCardDetails } from "../generated/wallet/WalletVerifyRequestCardDetails";

const NPG_API_KEY = config.NPG_API_KEY;

const encode = (str: string): string =>
  Buffer.from(str, "binary").toString("base64");

export const createSuccessValidationResponseEntityFromNPG = (confirmResponse: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly jsonResponse: any;
  readonly orderId: string;
}): WalletVerifyRequestsResponse => ({
  details: {
    iframeUrl: encode(confirmResponse.jsonResponse.fieldSet.fields[0].src),
    type: "CARD"
  } as WalletVerifyRequestCardDetails,
  orderId: confirmResponse.orderId
});

export const confirmPaymentFromNpg: RequestHandler = async (_req, res) => {
  const sessionId = getSessionIdCookie(_req);
  const orderId = _req.params.orderId;
  const postData = JSON.stringify({
    amount: "0",
    sessionId
  });

  logger.info(
    `[Invoke NPG confirm payment with npg-session id: ${sessionId}] - Return success case`
  );

  const correlationId = uuid();
  const response = await fetch(
    "https://stg-ta.nexigroup.com/api/phoenix-0.0/psp/api/v1/build/confirm_payment",
    {
      body: postData,
      headers: {
        "Content-Type": "application/json",
        "Correlation-Id": correlationId,
        "X-Api-key": NPG_API_KEY
      },
      method: "POST"
    } as RequestInit
  );
  await pipe(
    TE.tryCatch(
      async () => response.json(),
      _e => {
        logger.error("Error invoking npg order build");
      }
    ),
    TE.map(jsonResponse =>
      pipe(
        // eslint-disable-next-line sort-keys
        { jsonResponse, orderId },
        createSuccessValidationResponseEntityFromNPG,
        WalletVerifyRequestsResponse.decode,
        E.fold(
          () => {
            logger.error("Error while invoke NPG unexpected body");
            res.status(response.status).send(jsonResponse);
          },
          responseBody => res.status(response.status).send(responseBody)
        )
      )
    ),
    TE.mapLeft(() => res.status(response.status).send())
  )();
};
