import * as t from "io-ts";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import { formatValidationErrors } from "io-ts-reporters";

const Config = t.partial({
  ENDPOINT_DELAY: t.number,
  LOG_LEVEL: t.string
});

export type Config = t.TypeOf<typeof Config>;

const getNumber = (
  env: Record<string, string | undefined>,
  key: string
): number | undefined => (env[key] ? Number(env[key]) : undefined);

const decodeEnv = (
  env: Record<string, string | undefined>
): Record<string, unknown> => ({
  ENDPOINT_DELAY: getNumber(env, "ENDPOINT_DELAY"),
  LOG_LEVEL: env.LOG_LEVEL
});

const getConfig = (): Config =>
  pipe(
    decodeEnv(process.env),
    Config.decode,
    E.fold(
      e => {
        throw formatValidationErrors(e);
      },
      v => v
    )
  );

export const config = getConfig();
