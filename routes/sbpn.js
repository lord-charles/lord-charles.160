const router = require("express").Router();
const {
  webhookTrigger,
  stkpush,
  paymentStatus,
  sendAirtime,
  disburseAirtime,
  validateVoucher,
  removeActiveSessions,
  fetchVouchers,
} = require("../controller/sbpn");

router.post("/", stkpush);
router.post("/transaction-complete", webhookTrigger);
router.post("/status", paymentStatus);
router.post("/sendAirtime", sendAirtime);
router.post("/disburseAirtime", disburseAirtime);
router.post("/validate-voucher", validateVoucher);
router.post("/removeActiveSessions", removeActiveSessions);
router.get("/fetchVouchers", fetchVouchers);

module.exports = router;
