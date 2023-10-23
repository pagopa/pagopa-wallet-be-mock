import { RequestHandler } from "express-serve-static-core";
import { v4 as uuid } from "uuid";
import { pipe } from "fp-ts/lib/function";
import { formatValidationErrors } from "io-ts-reporters";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { logger } from "../logger";
import { config } from "../config";
import { SessionWalletCreateResponse } from "../generated/wallet/SessionWalletCreateResponse";
import { Field } from "../generated/wallet/Field";
import { ProblemJson } from "../generated/wallet/ProblemJson";

const NPG_API_KEY = config.NPG_API_KEY;
const NPG_NOTIFICATION_URL = config.NPG_NOTIFICATION_URL;
const NPG_CANCEL_URL = config.NPG_CANCEL_URL;
const NPG_RESULT_URL = config.NPG_RESULT_URL;

export const internalServerError = (): ProblemJson => ({
  detail: "Internal Server Error",
  title: "Invalid npg body response"
});

export const buildWalletFieldsResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionResponse: { readonly jsonResponse: any; readonly orderId: string }
): SessionWalletCreateResponse => ({
  cardFormFields: sessionResponse.jsonResponse.fields as ReadonlyArray<Field>,
  orderId: sessionResponse.orderId
});

export const createFormWithNpg: RequestHandler = async (_req, res) => {
  const walletId = _req.params.walletId;
  if (walletId == null) {
    logger.error("Missing walletId param!");
    return res.status(400).send("Missing walletId param!");
  }

  logger.info(
    `[Invoke NPG for create form using walletId: ${_req.params.walletId}] - Return success case`
  );

  const orderId = uuid().substring(0, 15);

  const postData = JSON.stringify({
    merchantUrl: `${_req.protocol}://${_req.get("Host")}`,
    order: {
      amount: "0",
      currency: "EUR",
      orderId
    },
    paymentSession: {
      actionType: "VERIFY",
      amount: "0",
      cancelUrl: NPG_CANCEL_URL,
      captureType: "IMPLICIT",
      language: "ITA",
      notificationUrl: NPG_NOTIFICATION_URL,
      paymentService: "CARDS",
      resultUrl: NPG_RESULT_URL
    },
    version: "2"
  });
  const correlationId = uuid();

  const response = await fetch(
    "https://stg-ta.nexigroup.com/api/phoenix-0.0/psp/api/v1/orders/build",
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
    TE.map(resp => {
      pipe(
        { jsonResponse: resp, orderId },
        buildWalletFieldsResponse,
        SessionWalletCreateResponse.decode,
        E.mapLeft(e => {
          logger.error(formatValidationErrors(e));
          return res.status(500).send(internalServerError());
        }),
        E.map(val => {
          res.status(response.status).send(val);
        })
      );
    }),
    TE.mapLeft(() => res.status(500).send(internalServerError()))
  )();
};
