const { Credentials } = require("uport-credentials");
const decodeJWT = require("did-jwt").decodeJWT;
const message = require("uport-transports").message.util;
const transports = require("uport-transports").transport;
const pushTransport = require("uport-transports").transport.push;
import { mySigner } from "../services/hsmSigner";
import {wrapPalaemonCredential} from "../utilities/CredentialResponseWrappers"
const request = require("request-promise");
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

const imageDataURI = require("image-data-uri");
var qr = require("qr-image");
import { streamToBuffer } from "@jorgeferrero/stream-to-buffer";

async function connectJolo(req, res, alice) {
  let ssiSessionId = req.query.ssiSessionId;
  let responseEndpoint = req.query.callback;
  let credentialsToRequest = {};
  let credentialDefinitions = JSON.parse(
    await fs.promises.readFile("./credentialDefinition.json")
  );
  let credentialTypes = ["Credential"];

  for (let [key, value] of Object.entries(credentialDefinitions)) {
    console.log(`will check for ${key} against ${req.query[key]}`);
    if (req.query[key] || req.query[key.toLowerCase()]) {
      // if (key.toLowerCase() === "eidas") {
      //   credentialsToRequest["SEAL-EIDAS"] = value;
      // }
      // if (key.toLowerCase() === "contact") {
      //   credentialsToRequest["CONTACT-DETAILS"] = value;
      // } else {
      //   credentialsToRequest[key] = value;
      // }
      credentialTypes.push(key);
    }
  }

  const aliceCredRequest = await alice.credRequestToken({
    callbackURL: responseEndpoint + `?ssiSessionId=${ssiSessionId}`,
    credentialRequirements: [
      {
        type: credentialTypes.flatMap((ele) => ele.replace("SEAL_myID:_", "")),
        constraints: [],
      },
    ],
  });

  // console.log(aliceCredRequest.encode());
  var code = qr.image(aliceCredRequest.encode(), {
    type: "png",
    ec_level: "H",
    size: 10,
    margin: 0,
  });
  let mediaType = "PNG";
  // RETURNS :: image data URI :: 'data:image/png;base64,PNGDATAURI/wD/'
  let encodedQR = imageDataURI.encode(await streamToBuffer(code), mediaType);
  res.send(
    `<div><img style="max-height: 27rem;" src="${encodedQR}" alt="qrCode" /> </div>`
  );
}


async function connectJoloMobile(req, res, alice) {
  let ssiSessionId = req.query.ssiSessionId;
  let responseEndpoint = req.query.callback;
  let credentialsToRequest = {};
  let credentialDefinitions = JSON.parse(
    await fs.promises.readFile("./credentialDefinition.json")
  );
  let credentialTypes = ["Credential"];

  for (let [key, value] of Object.entries(credentialDefinitions)) {
    console.log(`will check for ${key} against ${req.query[key]}`);
    if (req.query[key] || req.query[key.toLowerCase()]) {
      credentialTypes.push(key);
    }
  }

  const aliceCredRequest = await alice.credRequestToken({
    callbackURL: responseEndpoint + `?ssiSessionId=${ssiSessionId}`,
    credentialRequirements: [
      {
        type: credentialTypes.flatMap((ele) => ele.replace("SEAL_myID:_", "")),
        constraints: [],
      },
    ],
  });

  // console.log(aliceCredRequest.encode());
  res.send(
    aliceCredRequest.encode()
  );
}




async function connectionResponseJolo(req, res, alice) {
  const jwt = req.body.token;
  console.log("*****************connectionResponseJolo****************");
  console.log(jwt);
  const ssiSessionId = req.query.ssiSessionId;
  const alicesInteraction = await alice.processJWT(jwt);
  // http://localhost:8081/auth/realms/test/sp/ssiResponse
  let keycloak = process.env.KEYCLOAK;
  console.log(`will post to ${keycloak}`);

  await alicesInteraction
    .getSummary()
    .state.providedCredentials.forEach((credentialResponse) => {
      credentialResponse._suppliedCredentials.forEach((credential) => {
        console.log(credential._claim);

                    /*
            {
              id: 'did:jun:Et5cGlSsRwGx-OLGvsrV3nwdHP5TE5Qmlq5lj7Bu3ByA',
              age: '1965-01-01',
              crewMember: 'false',
              gender: 'Male',
              medical_conditions: 'none',
              name: 'CLAUDE',
              role: 'passenger',
              surname: 'PHIL',
              ticketNumber: '123'
            }

            */

        /*
      {
        id: 'did:jun:EiC4Zw5Nj8uqRbpn0w5C-VBwMs_9_8AjKJNdyv-BqaZg',
        date_of_birth: '1980-01-01',
        family_name: 'ΠΕΤΡΟΥ PETROU',
        given_name: 'ΑΝΔΡΕΑΣ ANDREAS',
        loa: 'low',
        person_identifier: 'GR/GR/ERMIS-11076669',
        source: 'eidas'
          }
      */
        // request.post(keycloak, {
        //   form: { sessionId: ssiSessionId, claims: JSON.stringify(credential._claim) },
        //   function(error, response, body) {
        //     if (error) {
        //       console.log("error:", error); // Print the error if one occurred
        //       res.sendStatus(500);
        //     } else {
        //       console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        //       console.log("body:", body); // Print the HTML for the Google homepage.
        //       res.sendStatus(200);
        //     }
        //   },
        // });
        if(credential._claim["ticketNumber"] || credential._claim["role"]){
          credential._claim = wrapPalaemonCredential(credential._claim) 
        }


        request
          .post(keycloak, {
            form: {
              sessionId: ssiSessionId,
              claims: JSON.stringify(credential._claim),
            },
          })
          .then((response) => {
            console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
            // res.sendStatus(200);
          })
          .catch((error) => {
            console.log("error:", error); // Print the error if one occurred
            res.sendStatus(500);
          });
        res.set({
          "access-control-expose-headers":
            "WWW-Authenticate,Server-Authorization",
          "content-type": "text/html; charset=utf-8",
          vary: "origin",
          "strict-transport-security": "max-age=31536000",
          "cache-control": "no-cache",
          "content-length": "0",
          "content-type": "text/html; charset=utf-8",
        });
        res.status(200).end();
      });
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
    "controllersJolo.js -- connectMobile:: will send responses to::" +
      redirectUri
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
      vc: ["/ipfs/QmW2NvgZ3AXGjRzmkbfCcEfjBE9byFwK9JMPGjnauixfvf"],
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
  credentials
    .authenticateDisclosureResponse(jwt)
    .then((creds) => {
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
    })
    .catch((err) => {
      console.log(err);
      res.redirect(`${keycloak}?ssiSessionId=${ssiSessionId}`);
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
  connectJolo,
  connectMobile,
  parseConnectionResponse,
  connectionResponseMobile,
  connectionResponseJolo,
  connectJoloMobile
};
