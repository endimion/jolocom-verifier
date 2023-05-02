const express = require("express");
const next = require("next");
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const bodyParser = require("body-parser");
const session = require("express-session");
const memoryStore = new session.MemoryStore();
const isProduction = process.env.NODE_ENV === "production";
const SESSION_CONF = {
  secret: "this is my super super secret, secret!! shhhh",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: memoryStore,
};
const port = parseInt(process.env.PORT, 10) || 6000;
const production = process.env.PRODUCTION || false;

const ngrok = require("ngrok");
import {
  connect,
  connectionResponse,
  connectMobile,
  parseConnectionResponse,
  connectionResponseMobile
} from "./controllers/controllers";
// ******************************************************************************
import {
  connectJolo,
  connectionResponseJolo,
  connectJoloMobile
} from "./controllers/controllersJolo";
// 00000000000000000000000000000000000000000000000000000000000000000000000000000000
import { JolocomSDK, NaivePasswordStore } from "@jolocom/sdk";
import { JolocomTypeormStorage } from "@jolocom/sdk-storage-typeorm";
import { createConnection } from "typeorm";
import * as WebSocket from "ws";
import { JolocomLib } from '@jolocom/sdk'
// 00000000000000000000000000000000000000000000000000000000000000000000000000000000

let endpoint = "";

(async () => {
  console.log("inside async 1")
// app.prepare().then(async () => {
  const server = express();
  server.use(bodyParser.json({ type: "*/*" }));
  // set session managment
  if (isProduction) {
    SESSION_CONF.cookie.secure = true; // serve secure cookies, i.e. only over https, only for production
  }
  server.use(session(SESSION_CONF));
  const typeOrmConfig = {
    name: "demoDb",
    type: "sqlite",
    database: ":memory:",
    dropSchema: true,
    entities: [
      "node_modules/@jolocom/sdk-storage-typeorm/js/src/entities/*.js",
    ],
    synchronize: true,
    logging: false,
  };
  console.log("inside async 2")

  const connection = await createConnection(typeOrmConfig);
  const sdk = new JolocomSDK({
    storage: new JolocomTypeormStorage(connection),
  });
  console.log("inside async 2.1")
  sdk.transports.ws.configure({ WebSocket });
  console.log("inside async 2.2")
  const alice = await sdk.createAgent("mySecretPassword", "jolo");
  console.log("inside async 3")



  server.get("/connectionRequestUport", (req, res) => {
    console.log("server.js :: heye connectionRequest called");
    req.endpoint = endpoint;
    return connect(req, res);
  });

  server.get("/connectionRequestJolo", (req, res) => {
    console.log("server.js :: heye connectionRequest called");
    req.endpoint = endpoint;
    return connectJolo(req, res,alice);
  });

  server.get("/connectionRequestJoloMobile", (req, res) => {
    console.log("server.js :: heye connectionRequest called");
    req.endpoint = endpoint;
    return connectJoloMobile(req, res,alice);
  });

  server.get("/connectionRequestMobile", (req, res) => {
    console.log("server.js :: heye connectionRequestMobile called");
    req.endpoint = endpoint;
    return connectMobile(req, res);
  });

  server.post("/connectionResponse", async (req, res) => {
    console.log("server.js :: heye connectionResponse called");
    return connectionResponse(req, res);
  });
  
  server.post("/connectionResponseJolo", async (req, res) => {
    console.log("server.js :: heye connectionResponseJolo called");
    return connectionResponseJolo(req, res, alice);
  });

  server.post("/parseConnectionResponse", async (req, res) => {
    console.log("server.js :: parseConnectionResponse called");
    return parseConnectionResponse(req, res);
  });

  server.post("/connectionResponseMobile/:ssiSessionId",async (req, res) => {
    console.log("server.js :: parseConnectionResponseMobile called");
    req.query.ssiSessionId = req.params.ssiSessionId;
    return connectionResponseMobile(req, res);
  });



  server.get("/connectionResponseMobile/:ssiSessionId",async (req, res) => {
    console.log("server.js GET:: parseConnectionResponseMobile called");
    let keycloak = process.env.KEYCLOAK_MOBILE;
    console.log(`will redirect to ${keycloak}`);
    res.redirect(`${keycloak}?ssiSessionId=${req.params.ssiSessionId}`);
  });

  console.log("inside async 4")
  server.all("*", (req, res) => {
    return handle(req, res);
  });
  
  console.log(`attmpting to run at localhost:${port}`)
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`attmpting to run at localhost:${port}`)
    if (!production) {
      ngrok.connect(port).then((ngrokUrl) => {
        endpoint = ngrokUrl;
        console.log(`running, open at ${endpoint}`);
      });
    }
    console.log(`running, open at localhost:${port}`);
  });
})().catch(err => {
  console.error(err);
});;
