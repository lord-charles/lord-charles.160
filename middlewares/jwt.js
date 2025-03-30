const expressJwt = require("express-jwt");
//yarn add express-jwt@6.1.0 use this version not new one

function authJwt() {
  const secret = process.env.SECRET;
  return expressJwt({
    secret,
    algorithms: ["HS256", "HS384", "HS512"],
    isRevoked: isRevoked, //very important by just adding this field , it will disallow non admin users not to post or access protected resources
    getToken: function (req) {
      if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
      ) {
        return req.headers.authorization.split(" ")[1];
      } else if (req.query && req.query.token) {
        return req.query.token;
      }
      return null;
    },
  }).unless({
    path: [
      { url: /\/public\/uploads(.*)/, methods: ["GET", "OPTIONS"] },
      { url: /\/products(.*)/, methods: ["GET", "OPTIONS"] },
      { url: /\/coupon(.*)/, methods: ["GET", "POST", "OPTIONS"] }, //only GET method isn't protected
      { url: /\/categories(.*)/, methods: ["GET", "OPTIONS"] },
      "/user/login",
      "/user/register",
      /\/user\/users\/update-user-details/,
      /\/user\/resetPassword\/(.*)/,
    ], // no need to secure log, register in api
  });
}
async function isRevoked(req, payload, done) {
  if (!payload.isAdmin) {
    done(null, true);
  } else {
    done();
  }
}
module.exports = authJwt;

///\/products(.*)/ is a regular expression instead of having many string of /product , we can specify multiple strings using (*) in regular expressions instead......../\ is used to escape /

//we can have /\/api\/products(.*)/
