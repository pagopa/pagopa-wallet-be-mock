/* eslint-disable sort-keys */
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import fetch from "node-fetch";
import { RequestHandler } from "express";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { logger } from "../logger";

const NPG_API_KEY = config.NPG_API_KEY ?? "";
const NPG_SDK_URL = "https://stg-ta.nexigroup.com/monetaweb/resources/hfsdk.js";
const NPG_SDK_SRI_HASH =
  "https://stg-ta.nexigroup.com/api/phoenix-0.0/psp/api/v1/build/integrity";

const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

const NPG_SDK_CACHE_KEY = "hfsdk.js";

const NPG_SDK_SRI_HASH_CACHE_KEY = "sri-hash";

const contentTypeHeaderKey = "Content-Type";

const cache: Record<string, string> = {};

const fetchNpgSdk = pipe(
  TE.tryCatch(() => {
    logger.info("Fetching NPG SDK from Nexi server");
    return fetch(NPG_SDK_URL, {
      method: "GET"
    });
  }, toError),
  TE.filterOrElse(
    response => response.status === 200,
    response =>
      new Error(`Error retrieving NPG SDK, status code: ${response.status}`)
  ),
  TE.chain(response => TE.tryCatch(() => response.text(), toError)),
  TE.map(body => {
    // eslint-disable-next-line functional/immutable-data
    cache[NPG_SDK_CACHE_KEY] = body;
    return body;
  })
);

export const getNpgSDK: RequestHandler = (_req, res) => {
  void pipe(
    O.fromNullable(cache[NPG_SDK_CACHE_KEY]),
    O.fold(() => fetchNpgSdk, TE.right),
    TE.map(body =>
      res
        .status(200)
        .set(contentTypeHeaderKey, "application/javascript")
        .send(body)
    ),
    TE.mapLeft(error => {
      logger.error("Error retrieving NPG SDK static resource", error);
      return res.status(502).send(error.message);
    })
  )();
};

const correlationId = uuid();

const fetchNpgSdkSriHash = pipe(
  TE.tryCatch(() => {
    logger.info("Fetching NPG SDK SRI hash from Nexi server");
    return fetch(NPG_SDK_SRI_HASH, {
      headers: {
        "X-Api-key": NPG_API_KEY,
        "Correlation-Id": correlationId
      },
      method: "GET"
    });
  }, toError),
  TE.filterOrElse(
    response => response.status === 200,
    response =>
      new Error(
        `Error retrieving NPG SDK sri hash, status code: ${response.status}`
      )
  ),
  TE.chain(response => TE.tryCatch(() => response.text(), toError)),
  TE.map(body => {
    logger.info(`NPG returned SRI hash response: ${body}`);
    // eslint-disable-next-line functional/immutable-data
    cache[NPG_SDK_SRI_HASH_CACHE_KEY] = body;
    return body;
  })
);

export const npgGetSdkIntegrity: RequestHandler = (_req, res) => {
  void pipe(
    O.fromNullable(cache[NPG_SDK_SRI_HASH_CACHE_KEY]),
    O.fold(() => fetchNpgSdkSriHash, TE.right),
    TE.map(body =>
      res
        .status(200)
        .set(contentTypeHeaderKey, "application/json")
        .send({
          integrityHash: JSON.parse(body).integrity
        })
    ),
    TE.mapLeft(error => {
      logger.error("Error retrieving NPG SDK SRI hash ", error);
      return res.status(502).send(error.message);
    })
  )();
};
