const hash256 = require("hash.js");
const EC = require("elliptic").ec;
// for testing
const Resolver = require('did-resolver')
// const ethrDid =  require('ethr-did-resolver').getResolver()
// end testing dependecies
const secp256k1 = new EC("secp256k1");

function sha3_256Hash(msg) {
  let hashBytes = hash256
    .sha256()
    .update(msg)
    .digest();
  return new Buffer(hashBytes);
}

function leftpad(data, size = 64) {
  if (data.length === size) return data;
  return "0".repeat(size - data.length) + data;
}

//this basically abstracts an API call to the HSM API
async function sign(data) {
  const _privateKey =
    "8317f9af8e80c610aa30dbd176ce8298b957177a633c5ab2fa879e2add05deb7";

  
  // Buffer.from(_privateKey, "hex", 32).toString();
  const privateKey = secp256k1.keyFromPrivate(_privateKey, "hex");

  const { r, s, recoveryParam } = secp256k1.sign(
    sha3_256Hash(data),
    privateKey
  );
  return {
    r: leftpad(r.toString("hex")),
    s: leftpad(s.toString("hex")),
    recoveryParam
  };
}

/*
A successfull call returns an object containing the following attributes:
r	Hex encoded r value of secp256k1 signature	yes
s	Hex encoded s value of secp256k1 signature	yes
recoveryParam	Recovery parameter of signature (can be used to calculate signing public key)	only required for (ES256K-R)
*/
function mySigner(data) {
  return new Promise((resolve, reject) => {
    const signature = sign(data); /// sign it over an API call HSM...
    resolve(signature); 
  });
}


export {  mySigner };
