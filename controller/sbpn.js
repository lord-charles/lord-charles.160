const axios = require("axios");
const Vouchers = require("../models/vouchers");

const api = axios.create({
  baseURL: "https://payment.intasend.com/api/v1/payment/",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.ISSecretKey}`,
  },
});

const requestHeaders = {
  accept: "application/json",
  "content-type": "application/json",
  Authorization: `Bearer ${process.env.ISSecretKey}`,
};

const stkpush = async (req, res) => {
  const { amount, phone_number, api_ref } = req.body;
  const endpoint = "mpesa-stk-push/";

  try {
    const response = await api.post(endpoint, {
      amount,
      phone_number,
      api_ref,
    });
    // console.log("stkpush response:", response.data);
    res.status(200).json({ paymentData: response.data, success: true });
  } catch (error) {
    if (error.code === "ERR_HTTP_INVALID_STATUS_CODE") {
      return res.status(200).send({ success: true, message: "temporary" });
    }
    res.status(500).json(error.message.code);
    console.log("this is temporary error", error);
  }
};

const sendAirtime = async (account) => {
  try {
    const requestData = {
      currency: "KES",
      provider: "AIRTIME",
      transactions: [{ account, amount: "5" }],
    };
    //  console.log(`sending airtime to ${account}`);
    // initiate sendAirtime
    const response = await axios.post(
      "https://payment.intasend.com/api/v1/send-money/initiate/",
      requestData,
      { headers: requestHeaders }
    );
    //  console.log("response1", response.data.status);

    // approve sendAirtime
    if (response.data.status === "Preview and approve") {
      const { available_balance } = response.data.wallet;
      const request_reference_id =
        response.data.transactions[0].request_reference_id;
      const { tracking_id } = response.data;
      //  console.log("disbursing");

      disburseAirtime(
        available_balance,
        request_reference_id,
        account,
        tracking_id
      );
    }
  } catch (error) {
    console.log(error);
  }
};
function calculateFutureDate(uptime) {
  const currentTimestamp = Date.now(); // Get the current timestamp in milliseconds

  // Extract the number of hours from the 'uptime' string
  const hours = parseInt(uptime, 10);

  if (!isNaN(hours)) {
    // If 'uptime' is a valid number of hours, calculate the future date
    const futureTimestamp = currentTimestamp + hours * 60 * 60 * 1000; // Convert hours to milliseconds

    // Add 3 hours to the future timestamp
    const futureTimestampWith3Hours = futureTimestamp + 3 * 60 * 60 * 1000;

    const futureDate = new Date(futureTimestampWith3Hours);
    return futureDate.toLocaleString(); // Convert to a user-friendly, locale-specific date and time format
  } else {
    return "Invalid input. Please provide a valid 'uptime' value in hours.";
  }
}

const webhookTrigger = async (req, res) => {
  try {
    const {
      invoice_id,
      state,
      failed_reason,
      api_ref,
      account,
      value,
      mpesa_reference,
    } = req.body;

    // console.log(req.body);

    // send sms code
    const sendCode = async (
      name,
      speed,
      bandwidth,
      devices,
      validity,
      period
    ) => {
      //  console.log("sms starting transaction");

      const future = calculateFutureDate(period);

      const message = `Voucher: ${name}
Account:${account}
Amount:${value}
Bandwidth: ${bandwidth}
Devices: ${devices}
Mpesa_ref:${mpesa_reference}
Expiry: ${future}

Thank you.`;

      // try {
      //   const data = JSON.stringify({
      //     mobile: account,
      //     sender_name: "23107",
      //     service_id: 0,
      //     message: message,
      //   });

      //   const config = {
      //     method: "post",
      //     maxBodyLength: Infinity,
      //     url: "https://api.mobitechtechnologies.com/sms/sendsms",
      //     headers: {
      //       h_api_key:
      //         "22dd6700b48060c8ae97dc4c4c2363d720dbbb7802050cc7701e350e580ee052",
      //       "Content-Type": "application/json",
      //     },
      //     data: data,
      //   };

      //   await axios.request(config);
      // } catch (error) {
      //   console.log("Error sending SMS:", error);
      // }

      try {
        await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
          apikey: "9d97e98deaa48d145fec88150ff28203",
          partnerID: "7848",
          message: message,
          shortcode: "TextSMS",
          mobile: account,
        });

        // Create a new instance of the Voucher model with the webhook data
        // const voucher = new Vouchers({
        //   Voucher: name,
        //   Account: account,
        //   Amount: value,
        //   bandwidth: bandwidth,
        //   devices: devices,
        //   Mpesa_ref: mpesa_reference,
        //   Expiry: future,
        // });

        // Save the voucher data to the database
        // const voucherres = await voucher.save();
        // console.log(voucherres);

        // await axios.post("https://sms.savvybulksms.com/api/services/sendsms/", {
        //   apikey: "0c53f737571fcf0eb3b60a8a9bcbfd83",
        //   partnerID: "8816",
        //   message: message,
        //   shortcode: "Savvy_sms",
        //   mobile: account,
        // });
      } catch (error) {
        console.log("Error sending SMS:", error);
      }
    };
    // send sms code
    const sendCode2 = async (
      name,
      speed,
      bandwidth,
      devices,
      validity,
      period
    ) => {
      const future = calculateFutureDate(period);

      const message = `${invoice_id} Confirmed. You have received Airtime of Ksh5.00.
Voucher: ${name}
Account:${account}
Amount:${value}
Bandwidth: ${bandwidth}
Devices: ${devices}
Mpesa_ref:${mpesa_reference}
Expiry: ${future}

Thank you.`;

      // try {
      //   const data = JSON.stringify({
      //     mobile: account,
      //     sender_name: "23107",
      //     service_id: 0,
      //     message: message,
      //   });

      //   const config = {
      //     method: "post",
      //     maxBodyLength: Infinity,
      //     url: "https://api.mobitechtechnologies.com/sms/sendsms",
      //     headers: {
      //       h_api_key:
      //         "22dd6700b48060c8ae97dc4c4c2363d720dbbb7802050cc7701e350e580ee052",
      //       "Content-Type": "application/json",
      //     },
      //     data: data,
      //   };

      //   await axios.request(config);
      // } catch (error) {
      //   console.log("Error sending SMS:", error);
      // }

      try {
        await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
          apikey: "9d97e98deaa48d145fec88150ff28203",
          partnerID: "7848",
          message: message,
          shortcode: "TextSMS",
          mobile: account,
        });
      } catch (error) {
        console.log("Error sending SMS:", error);
      }
    };

    // add to mikrotic
    const addUserToMikrotik = async ({
      name,
      profile,
      uptime,
      bytes,
      period,
    }) => {
      function calculateFutureDate(uptime) {
        const currentTimestamp = Date.now(); // Get the current timestamp in milliseconds

        // Extract the number of hours from the 'uptime' string
        const hours = parseInt(uptime, 10);

        if (!isNaN(hours)) {
          // If 'uptime' is a valid number of hours, calculate the future date
          const futureTimestamp = currentTimestamp + hours * 60 * 60 * 1000; // Convert hours to milliseconds

          // Add 3 hours to the future timestamp
          const futureTimestampWith3Hours =
            futureTimestamp + 3 * 60 * 60 * 1000;

          const futureDate = new Date(futureTimestampWith3Hours);
          return futureDate.toLocaleString(); // Convert to a user-friendly, locale-specific date and time format
        } else {
          return "Invalid input. Please provide a valid 'uptime' value in hours.";
        }
      }

      const future = calculateFutureDate(period);

      const data = {
        "limit-bytes-total": bytes,
        "limit-uptime": uptime,
        name,
        password: name,
        profile,
        server: "hotspot1",
        comment: future,
      };
      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "http://id-3.hostddns.us:4347/rest/ip/hotspot/user/add",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic YWRtaW46MDI2MTQ=",
        },
        data: data,
      };

      try {
        const response = await axios.request(config);
        console.log(response.data);
      } catch (error) {
        try {
          await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
            apikey: "9d97e98deaa48d145fec88150ff28203",
            partnerID: "7848",
            message: `Something went wrong for account ${account}, package ${value}, please review ASAP.`,
            shortcode: "TextSMS",
            mobile: 254740315545,
          });

          await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
            apikey: "9d97e98deaa48d145fec88150ff28203",
            partnerID: "7848",
            message: `We are processing your voucher, please wait.`,
            shortcode: "TextSMS",
            mobile: account,
          });
        } catch (nestedError) {
          console.log("Error sending SMS:", nestedError);
        }
        console.log("Error adding user to Mikrotik:", error);
      }
    };

    // generate code
    const generateUniqueCode = () => {
      const currentDate = new Date();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      let hours = String(currentDate.getHours() + 3).padStart(2, "0");
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");
      const seconds = String(currentDate.getSeconds()).padStart(2, "0");

      // Convert hours to 12-hour format
      if (hours > 12) {
        hours -= 12;
      }

      return `${month}${day}${hours}${minutes}${seconds}`;
    };

    // generate code
    const generateUniqueCode2 = () => {
      const currentDate = new Date();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      let hours = String(currentDate.getHours() + 3).padStart(2, "0");
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");
      const seconds = String(currentDate.getSeconds()).padStart(2, "0");

      // Convert hours to 12-hour format
      if (hours > 12) {
        hours -= 12;
      }

      return `W${month}${day}${hours}${minutes}${seconds}`;
    };

    // generate code
    const generateUniqueCode3 = () => {
      const currentDate = new Date();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      let hours = String(currentDate.getHours() + 3).padStart(2, "0");
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");
      const seconds = String(currentDate.getSeconds()).padStart(2, "0");

      // Convert hours to 12-hour format
      if (hours > 12) {
        hours -= 12;
      }

      return `M${month}${day}${hours}${minutes}${seconds}`;
    };

    // wrong mpesa pin
    if (failed_reason === "The initiator information is invalid.") {
      try {
        await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
          apikey: "9d97e98deaa48d145fec88150ff28203",
          partnerID: "7848",
          message:
            "Uh-oh! It seems like there was an issue with your M-Pesa PIN. To complete your ClassicsNetPro package purchase, we kindly ask you to double-check and enter the correct PIN. Thank you!",
          shortcode: "TextSMS",
          mobile: account,
        });
      } catch (error) {
        console.log("Error sending SMS:", error);
      }
    }

    if (state === "COMPLETE") {
      if (value === "19.00") {
        const profile = "3mbps3h";
        const name = generateUniqueCode();
        const uptime = "6h";
        const bytes = "30000000000";
        const speed = "8Mbps";
        const bandwidth = "30GB";
        const devices = "2";
        const validity = "6hours";
        const period = "6h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "7.00") {
        const profile = "3mbps1h";
        const name = generateUniqueCode();
        const uptime = "1h";
        const bytes = "10000000000";
        const speed = "8Mbps";
        const bandwidth = "10GB";
        const devices = "1";
        const validity = "1hour";
        const period = "1h";
        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "20.00") {
        const profile = "3mbps";
        const name = generateUniqueCode();
        const uptime = "21h";
        const bytes = "5G";
        const speed = "10Mbps";
        const bandwidth = "5GB";
        const devices = "2";
        const validity = "21hours";
        const period = "21h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "30.00") {
        const profile = "3mbps";
        const name = generateUniqueCode();
        const uptime = "12h";
        const bytes = "40000000000";
        const speed = "5Mbps";
        const bandwidth = "50GB";
        const devices = "2";
        const validity = "12hours";
        const period = "12h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "35.00") {
        const profile = "3mbps";
        const name = generateUniqueCode();
        const uptime = "21h";
        const bytes = "10G";
        const speed = "5Mbps";
        const bandwidth = "10GB";
        const devices = "2";
        const validity = "21hours";
        const period = "21h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode2(name, speed, bandwidth, devices, validity, period);
          await sendAirtime(account);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "25.00") {
        const profile = "4mbps";
        const name = generateUniqueCode();
        const uptime = "21h";
        const bytes = "7G";
        const speed = "10Mbps";
        const bandwidth = "7GB";
        const devices = "2";
        const validity = "21hours";
        const period = "21h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "10.00" && account === "254702359241") {
        const profile = "3mbps";
        const name = generateUniqueCode();
        const uptime = "21h";
        const bytes = "5G";
        const speed = "10Mbps";
        const bandwidth = "5GB";
        const devices = "2";
        const validity = "21hours";
        const period = "21h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "25.00" && account === "254790828294") {
        const profile = "5mbps";
        const name = generateUniqueCode();
        const uptime = "21h";
        const bytes = "6G";
        const speed = "3sMbps";
        const bandwidth = "6GB";
        const devices = "2";
        const validity = "21hours";
        const period = "21h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "150.00") {
        const profile = "3mbps";
        const name = generateUniqueCode2();
        const uptime = "160h";
        const bytes = "40G";
        const speed = "8Mbps";
        const bandwidth = "40GB";
        const devices = "2";
        const validity = "7days";
        const period = "168h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "250.00") {
        const profile = "4mbps";
        const name = generateUniqueCode2();
        const uptime = "160h";
        const bytes = "80G";
        const speed = "8Mbps";
        const bandwidth = "80GB";
        const devices = "2";
        const validity = "7days";
        const period = "168h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "200.00") {
        const profile = "3mbps";
        const name = generateUniqueCode2();
        const uptime = "160h";
        const bytes = "60G";
        const speed = "8Mbps";
        const bandwidth = "60GB";
        const devices = "2";
        const validity = "7days";
        const period = "168h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "14.00") {
        const profile = "3mbps1h";
        const name = generateUniqueCode();
        const uptime = "3h";
        const bytes = "20000000000";
        const speed = "8Mbps";
        const bandwidth = "20GB";
        const devices = "2";
        const validity = "2hours";
        const period = "2h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "500.00") {
        const profile = "3mbps";
        const name = generateUniqueCode3();
        const uptime = "640h";
        const bytes = "70G";
        const speed = "8Mbps";
        const bandwidth = "70GB";
        const devices = "2";
        const validity = "30days";
        const period = "640h";

        try {
          await addUserToMikrotik({
            name,
            profile,
            uptime,
            bytes,
            speed,
            bandwidth,
            devices,
            validity,
            period,
          });
          await sendCode(name, speed, bandwidth, devices, validity, period);
        } catch (error) {
          console.log("Error adding user and sending code:", error);
        }
      } else if (value === "1.00") {
        await checkVoucherBalance(api_ref, account);
      }
    }

    // const filter = { "invoice.invoice_id": invoice_id };
    // const update = {
    //   $set: {
    //     "invoice.state": state,
    //     "invoice.failed_reason": failed_reason,
    //     "invoice.failed_code": failed_code,
    //   },
    // };

    // const updatedPayment = await Payment.findOneAndUpdate(filter, update, {
    //   new: true,
    // });

    res.status(200).json({
      message: "Payload received successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating payment" });
  }
};

const paymentStatus = async (req, res) => {
  const options = {
    method: "POST",
    url: "https://payment.intasend.com/api/v1/payment/status/",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-IntaSend-Public-API-Key": process.env.ISPubKey,
    },
    data: { invoice_id: req.body.invoice_id },
  };

  try {
    const response = await axios.request(options);
    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred", error });
  }
};

const disburseAirtime = async (
  availableBalance,
  requestReferenceId,
  account,
  trackingId
) => {
  try {
    const options = {
      method: "POST",
      url: "https://payment.intasend.com/api/v1/send-money/approve/",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.ISSecretKey}`,
      },
      data: {
        wallet: {
          label: "default",
          can_disburse: true,
          currency: "KES",
          wallet_type: "SETTLEMENT",
          available_balance: availableBalance,
        },
        transactions: [
          {
            request_reference_id: requestReferenceId,
            account,
            amount: "5",
          },
        ],
        tracking_id: trackingId,
        nonce: "415c57",
      },
    };

    const response = await axios.request(options);
    // console.log(response.data);

    // Send SMS
    try {
      await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
        apikey: "9d97e98deaa48d145fec88150ff28203",
        partnerID: "7848",
        message: `Airtime of Ksh 5 has been sent to ${account}, remaining account balance is ${availableBalance}`,
        shortcode: "TextSMS",
        mobile: "254740315545",
      });
    } catch (smsError) {
      console.log("Error sending SMS:", smsError);
    }
  } catch (error) {
    console.log("Error disburseAirtime:", error);
  }
};

const checkVoucherBalance = async (api_ref, account) => {
  try {
    const response = await axios.get(
      `http://id-3.hostddns.us:4347/rest/ip/hotspot/user?name=${api_ref}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic YWRtaW46MDI2MTQ=",
        },
      }
    );

    // console.log(response.data);

    // mikrotic calculations

    if (response.data.length !== 0) {
      const data = response.data[0];

      const {
        ".id": id,
        "bytes-in": bytesIn,
        "bytes-out": bytesOut,
        comment,
        disabled,
        dynamic,
        "limit-bytes-total": limitBytesTotal,
        "limit-uptime": limitUptime,
        name,
        "packets-in": packetsIn,
        "packets-out": packetsOut,
        password,
        profile,
        server,
        uptime,
      } = data;

      // Convert limit-uptime to hours
      const limitUptimeHours = parseLimitUptime(limitUptime);

      // Convert bytes-in and bytes-out to numbers
      const bytesInNumber = parseFloat(bytesIn);
      const bytesOutNumber = parseFloat(bytesOut);

      // Convert limit-bytes-total to a number
      const limitBytesTotalNumber = parseFloat(limitBytesTotal);

      // Check if the conversions were successful
      if (
        !isNaN(bytesInNumber) &&
        !isNaN(bytesOutNumber) &&
        !isNaN(limitBytesTotalNumber) &&
        !isNaN(limitUptimeHours)
      ) {
        // Calculate the remaining bytes
        const remainingBytes =
          limitBytesTotalNumber - (bytesInNumber + bytesOutNumber);

        // Convert remaining bytes to gigabytes
        const remainingGB = remainingBytes / 1000000000; // 1 GB = 1,073,741,824 bytes

        // console.log(
        //   "Remaining Gigabytes:",
        //   remainingGB.toFixed(2) + " GB",
        //   name
        // );

        await sendCode3({
          code: name,
          balance: remainingGB.toFixed(2),
          time: comment,
          uptime,
          account,
        });
      } else {
        console.log("Invalid byte or uptime values.");
      }
    }

    // Function to parse limit-uptime to hours
    function parseLimitUptime(limitUptime) {
      const regex = /(\d+)([dhms])/g;
      let totalHours = 0;

      let match;
      while ((match = regex.exec(limitUptime)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];
        if (unit === "d") {
          totalHours += value * 24;
        } else if (unit === "h") {
          totalHours += value;
        } else if (unit === "m") {
          totalHours += value / 60;
        } else if (unit === "s") {
          totalHours += value / 3600;
        }
      }

      return totalHours;
    }
  } catch (error) {
    console.log(error);
  }
};

// send sms code
const sendCode3 = async ({ code, balance, time, uptime, account }) => {
  //  console.log("sms starting transaction");

  const message = `Balance for ${code}
Data balance: ${balance}Gb
Expiry: ${time}
Uptime(ative time):${uptime}
Account:${account}

Thank you.`;

  try {
    await axios.post("https://sms.textsms.co.ke/api/services/sendsms/", {
      apikey: "9d97e98deaa48d145fec88150ff28203",
      partnerID: "7848",
      message: message,
      shortcode: "TextSMS",
      mobile: account,
    });
  } catch (error) {
    console.log("Error sending SMS:", error);
  }
};

const validateVoucher = async (req, res) => {
  try {
    const { voucher } = req.body;
    const response = await axios.get(
      `http://id-3.hostddns.us:4347/rest/ip/hotspot/user?name=${voucher}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic YWRtaW46MDI2MTQ=",
        },
      }
    );
    console.log(response.data);

    response.data.length >= 1
      ? res.status(200).json({ success: true })
      : res.status(200).json({ success: false });
  } catch (error) {
    res.status(500).json({ message: "Server is offline" });
  }
};

const removeActiveSessions = async (req, res) => {
  try {
    const { voucher } = req.body;
    const response = await axios.get(
      `http://id-3.hostddns.us:4347/rest/ip/hotspot/active?user=${voucher}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic YWRtaW46MDI2MTQ=",
        },
      }
    );

    if (response.data.length >= 1) {
      const activeSessions = response.data[0][".id"];
      let data = JSON.stringify({
        ".id": activeSessions,
      });
      console.log(activeSessions);

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "http://id-3.hostddns.us:4347/rest/ip/hotspot/active/remove",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic YWRtaW46MDI2MTQ=",
        },
        data: data,
      };

      axios
        .request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data));
        })
        .catch((error) => {
          console.log(error);
        });

      res.status(200).json({ success: true, data: activeSessions });
    } else {
      res.status(200).json({ success: false });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server is offline", error: error.message });
  }
};

const fetchVouchers = async (req, res) => {
  try {
    // Fetch all vouchers from the database
    const vouchers = await Vouchers.find();

    // If there are no vouchers found, return an error response
    if (!vouchers) {
      return res.status(404).json({ error: "No vouchers found" });
    }

    // If vouchers are found, return them in the response
    res.json({ vouchers });
  } catch (error) {
    // If an error occurs, return an error response
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  webhookTrigger,
  stkpush,
  paymentStatus,
  sendAirtime,
  disburseAirtime,
  validateVoucher,
  removeActiveSessions,
  fetchVouchers,
};
