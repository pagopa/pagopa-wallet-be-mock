import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import { logger } from "./logger";

export const setSessionIdCookie: (
  res: express.Response,
  sessionId: string
) => void = (res, sessionId) => {
  logger.info(`Set session cookie to: [${sessionId}]`);
  res.cookie("sessionId", sessionId);
};

export const maybeGetSessionIdCookie: (
  req: express.Request
) => O.Option<string> = req =>
  pipe(O.fromNullable(req.cookies.sessionId), id => {
    logger.info(`Request sessionId cookie: [${req.cookies.sessionId}]`);
    return id;
  });

export const getSessionIdCookie: (req: express.Request) => string = req =>
  pipe(
    maybeGetSessionIdCookie(req),
    O.getOrElse(() => "")
  );

export const waitTime: (timeMillis: number) => Promise<void> = time =>
  new Promise(resolve => setTimeout(() => resolve(), time));
