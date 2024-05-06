import { RequestHandler } from "express";
import { logger } from "../logger";
import { BundleOption } from "../generated/wallet/BundleOption";

export const getPsps: RequestHandler = async (_req, res) => {
  const walletId = _req.params.walletId;

  logger.info(
    `[Retrieve psps from walletId ${walletId}] - Return success case`
  );

  return res.send({
    belowThreshold: false,
    bundleOptions: [
      {
        abi: "32532",
        bundleDescription: "Bundle description 1",
        bundleName: "Bundle name 1",
        idBrokerPsp: "123456",
        idBundle: "123",
        idChannel: "123",
        idCiBundle: "123",
        idPsp: "123",
        onUs: false,
        paymentMethod: "paypal",
        primaryCiIncurredFee: 0,
        pspBusinessName: "Business Name 1",
        taxPayerFee: 0,
        touchpoint: "IO"
      },
      {
        abi: "32530",
        bundleDescription: "Bundel description 2",
        bundleName: "Bundle name 2",
        idBrokerPsp: "1234",
        idBundle: "1234",
        idChannel: "1234",
        idCiBundle: "1234",
        idPsp: "1234",
        onUs: false,
        paymentMethod: "paypal",
        primaryCiIncurredFee: 0,
        pspBusinessName: "Business Name 2",
        taxPayerFee: 0,
        touchpoint: "IO"
      }
    ]
  } as BundleOption);
};
