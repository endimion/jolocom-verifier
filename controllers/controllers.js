const { Credentials } = require("uport-credentials");
const decodeJWT = require("did-jwt").decodeJWT;
const message = require("uport-transports").message.util;
const transports = require("uport-transports").transport;
const pushTransport = require("uport-transports").transport.push;
import { mySigner } from "../services/hsmSigner";
const request = require("request");
const fs = require("fs");
const MemcacheClient = require("memcache-client");
let memcachedServer = process.env.MEMCACHED
  ? process.env.MEMCACHED
  : "memcached:11211";
const client = new MemcacheClient({
  server: memcachedServer,
  ignoreNotStored: true,
});
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
const providerConfig = {
  rpcUrl: "https://mainnet.infura.io/v3/7f068d3f3ad94c0ca0070ea9ce366a93",
};
const resolver = new Resolver(getResolver(providerConfig));

const credentials = new Credentials({
  appName: "MyIssuer",
  did: "did:ethr:0x2df113c8ffe13ed0aaadc86995b7b09391509b52",
  signer: mySigner,
  resolver,
});

async function connect(req, res) {
  let ssiSessionId = req.query.ssiSessionId;
  let credentialsToRequest = {};
  let credentialDefinitions = JSON.parse(
    await fs.promises.readFile("./credentialDefinition.json")
  );

  for (let [key, value] of Object.entries(credentialDefinitions)) {
    console.log(`will check for ${key} against ${req.query[key]}`);
    if (req.query[key] || req.query[key.toLowerCase()]) {
      if (key.toLowerCase() === "eidas") {
        credentialsToRequest["SEAL-EIDAS"] = value;
      }
      if (key.toLowerCase() === "contact") {
        credentialsToRequest["CONTACT-DETAILS"] = value;
      } else {
        credentialsToRequest[key] = value;
      }
    }
  }
  // console.log(credentialsToRequest)
  // console.log(credentialDefinitions)
  let responseEndpoint = req.query.callback;
  console.log("controllers.js:: will send responses to::" + responseEndpoint);
  let requesterDID = process.env.REQUESTER_DID
    ? process.env.REQUESTER_DID
    : "did:ethr:0x2df113c8ffe13ed0aaadc86995b7b09391509b52";
  credentials
    .createDisclosureRequest({
      iss: requesterDID,
      type: "shareReq",
      callbackUrl: responseEndpoint + `?ssiSessionId=${ssiSessionId}`, // + `/connectionResponse?ssiSessionId=${ssiSessionId}`,
      vc: ['/ipfs/QmW2NvgZ3AXGjRzmkbfCcEfjBE9byFwK9JMPGjnauixfvf'],
      claims: {
        verifiable: credentialsToRequest,
      },
    })
    .then((requestToken) => {
      console.log("**************Request******************");
      console.log(decodeJWT(requestToken)); //log request token to console
      const uri = message.paramsToQueryString(
        message.messageToURI(requestToken),
        { callback_type: "post" }
      );
      console.log(uri);
      const qr = transports.ui.getImageDataURI(uri);
      res.send(`<div><img src="${qr}"/></div>`);
    });
}

async function connectMobile(req, res) {
  let ssiSessionId = req.query.ssiSessionId;
  let credentialsToRequest = {};
  let credentialDefinitions = JSON.parse(
    await fs.promises.readFile("./credentialDefinition.json")
  );

  console.log(`will itrate trhought credentials def`);
  for (let [key, value] of Object.entries(credentialDefinitions)) {
    console.log(`will check for ${key} against ${req.query[key]}`);
    if (req.query[key]) {
      switch (key.toLowerCase()) {
        case "eidas":
          credentialsToRequest["SEAL-EIDAS"] = value;
          break;
        case "contact":
          credentialsToRequest["CONTACT-DETAILS"] = value;
          break;
        default:
          credentialsToRequest[key] = value;
          break;
      }
    }
  }

  // let redirectUri = req.query.callback;
  let redirectUri =
    "https://dss1.aegean.gr/uportHelper/connectionResponseMobile";
  console.log(
    "controllers.js -- connectMobile:: will send responses to::" + redirectUri
  );
  let requesterDID = process.env.REQUESTER_DID
    ? process.env.REQUESTER_DID
    : "did:ethr:0x2df113c8ffe13ed0aaadc86995b7b09391509b52";
  // let uri = encodeURI(`${redirectUri}/${ssiSessionId}`);
  credentials
    .createDisclosureRequest({
      iss: requesterDID,
      type: "shareReq",
      callbackUrl: `${redirectUri}/${ssiSessionId}`, // + `/connectionResponse?ssiSessionId=${ssiSessionId}`,
      vc: ['/ipfs/QmW2NvgZ3AXGjRzmkbfCcEfjBE9byFwK9JMPGjnauixfvf'],
      claims: {
        verifiable: credentialsToRequest,
      },
    })
    .then((requestToken) => {
      //Maybe this should be done by sending a GET request to the redirect url (the actual jwt will be a fragment #)
      // keycloak endpoint will not be able to catch the fragment
      // so we need to cache it in the same cache keycloak has acccess to
      // and add as a parameter to the call the key of the cache
      //
      const ssiSessionId = req.query.ssiSessionId;

      let result = `${requestToken}?redirect_type=post&redirect_url=${redirectUri}/${ssiSessionId}`;
      console.log(`responses will be sent to ${result}`);
      res.send(result);
    });
}

function connectionResponseMobile(req, res) {
  const jwt = req.body.access_token;
  const ssiSessionId = req.query.ssiSessionId;
  console.log(`the ssiSessionId is ${ssiSessionId}`);
  let keycloak = process.env.KEYCLOAK_MOBILE;
  console.log("**************Verifier:: RESPONSE******************");
  credentials.authenticateDisclosureResponse(jwt).then((creds) => {
    //validate specific data per use case
    console.log(`controllers.js:: creds!!!!`);
    console.log(creds);

    console.log("will set to " + `creds-${ssiSessionId}`);
    console.log("value::" + JSON.stringify(creds));
    client
      .set(`creds-${ssiSessionId}`, JSON.stringify(creds))
      .then((r) => console.log(r));


    console.log(`will redirect to ${keycloak}`);
    res.redirect(`${keycloak}?ssiSessionId=${ssiSessionId}`);
  }).catch(err => {
    console.log(err);
    res.redirect(`${keycloak}?ssiSessionId=${ssiSessionId}`);

  });

  //   request
  //     .post(keycloak, {
  //       form: { sessionId: ssiSessionId, claims: JSON.stringify(creds) },
  //     })
  //     .then((resp) => {
  //       console.log(response);
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // })
  // .catch((err) => {
  //   console.log("oops");
  //   console.log(err);
  // });
}

function connectionResponse(req, res) {
  const jwt = req.body.access_token;
  const ssiSessionId = req.query.ssiSessionId;
  console.log(`the ssiSessionId is ${ssiSessionId}`);
  console.log("**************Verifier:: RESPONSE******************");
  credentials
    .authenticateDisclosureResponse(jwt)
    .then((creds) => {
      //validate specific data per use case
      console.log(`controllers.js:: verified creds!!!!`);
      console.log(creds);
      // console.log(`controllers.js:: creds.verified[0]!!!!`);
      // console.log(creds.verified[0]);
      // console.log(creds.eidas);

      // http://localhost:8081/auth/realms/test/sp/ssiResponse
      let keycloak = process.env.KEYCLOAK;
      console.log(`will post to ${keycloak}`);
      request.post(keycloak, {
        form: { sessionId: ssiSessionId, claims: JSON.stringify(creds) },
        function(error, response, body) {
          if (error) {
            console.log("error:", error); // Print the error if one occurred
            res.sendStatus(500);
          } else {
            console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
            console.log("body:", body); // Print the HTML for the Google homepage.
            res.sendStatus(200);
          }
        },
      });
      // .then((resp) => {
      //   console.log(response);
      //   res.sendStatus(200);
      // })
      // .catch((err) => {
      //   console.log(err);
      //   res.sendStatus(500);
      // });
    })
    .catch((err) => {
      console.log("oops");
      console.log(err);
      res.sendStatus(500);
    });
}

function parseConnectionResponse(req, res) {
  const jwt = req.body.access_token;
  console.log(
    "**************Verifier:: parseConnectionResponse******************"
  );
  console.log(`got the jwt ${jwt}`);
  credentials
    .authenticateDisclosureResponse(jwt)
    .then((creds) => {
      console.log(creds);
      res.send(creds);
    })
    .catch((err) => {
      console.log("oops");
      console.log(err);
    });
}

export {
  connect,
  connectionResponse,
  connectMobile,
  parseConnectionResponse,
  connectionResponseMobile,
};
