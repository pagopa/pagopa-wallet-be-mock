/* eslint-disable sort-keys */
import * as express from "express";
import * as cookieParser from "cookie-parser";
import { config } from "./config";
import { createFormWithNpg } from "./handler/retrieve-fields";
import { confirmPaymentFromNpg } from "./handler/validations";
import { getSessionWalletInformation } from "./handler/get-session-information";
import { getPsps } from "./handler/get-psps";

// eslint-disable-next-line max-lines-per-function
export const newExpressApp: () => Promise<Express.Application> = async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use((req, res, next) => {
    setTimeout(next, config.ENDPOINT_DELAY);
  });

  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Authorization, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Methods", [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ]);
    next();
  });

  app.post(
    "/webview-payment-wallet/v1/wallets/:walletId/sessions",
    createFormWithNpg
  );

  app.post(
    "/webview-payment-wallet/v1/wallets/:walletId/sessions/:orderId/validations",
    confirmPaymentFromNpg
  );

  app.get(
    "/webview-payment-wallet/v1/wallets/:walletId/sessions/:orderId",
    getSessionWalletInformation
  );

  app.get("/webview-payment-wallet/v1/wallets/:walletId/psps", getPsps);

  return app;
};
