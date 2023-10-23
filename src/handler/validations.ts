import { RequestHandler } from "express-serve-static-core";
import { v4 as uuid } from "uuid";
import { pipe } from "fp-ts/lib/function";
import { formatValidationErrors } from "io-ts-reporters";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { logger } from "../logger";
import { config } from "../config";
import { WalletVerifyRequestsResponse } from "../generated/wallet/WalletVerifyRequestsResponse";
import { ProblemJson } from "../generated/wallet/ProblemJson";

const NPG_API_KEY = config.NPG_API_KEY;

const npgEnvironment =
  "https://stg-ta.nexigroup.com/api/phoenix-0.0/psp/api/v1";

export const internalServerError = (): ProblemJson => ({
  detail: "Internal Server Error",
  title: "Invalid npg body response"
});

export const buildWalletVerify = (verifyResponse: {
  readonly jsonResponse: { readonly state: string; readonly url: string };
  readonly sessionId: string;
}): WalletVerifyRequestsResponse => ({
  details: {
    iframeUrl: verifyResponse.jsonResponse.url,
    type: "CARD"
  },
  sessionId: verifyResponse.sessionId
});

interface IReq {
  readonly walletId: string;
}

export const validations: RequestHandler<IReq> = async (req, res) => {
  const { walletId } = req.params;
  if (walletId === null) {
    logger.error("Missing walletId param!");
    return res.status(400).send("Missing walletId param!");
  }

  logger.info(
    `[Invoke NPG for create form using walletId: ${req.params.walletId}] - Return success case`
  );

  // maybe the same corraleation id created on /sessions needs to be used
  const correlationId = uuid();

  // how to retrieve it?
  // const sessionId = "";

  const fetchConfirm = await fetch(`${npgEnvironment}/build/confirm_payment`, {
    body: JSON.stringify({
      amount: "1",
      sessionId: "to valuate"
    }),
    headers: {
      "Content-Type": "application/json",
      "Correlation-Id": correlationId,
      "X-Api-key": NPG_API_KEY
    },
    method: "POST"
  } as RequestInit);

  await pipe(
    TE.tryCatch(
      async (): Promise<{ readonly state: "string"; readonly url: string }> =>
        await fetchConfirm.json(),
      _e => {
        logger.error("Error invoking npg order confirm");
      }
    ),
    TE.map(resp => {
      pipe(
        { jsonResponse: resp, sessionId: "" },
        buildWalletVerify,
        WalletVerifyRequestsResponse.decode,
        E.mapLeft(e => {
          logger.error(formatValidationErrors(e));
          return res.status(500).send(internalServerError());
        }),
        E.map(val => {
          res.status(fetchConfirm.status).send(val);
        })
      );
    }),
    TE.mapLeft(() => res.status(500).send(internalServerError()))
  )();
};
