require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');


const clientLocal = new DynamoDBClient({
    region: process.env.REGION,
    credentials: fromIni({ profile: 'dev' }),
});
const clientRemote = new DynamoDBClient({});

module.exports = { clientLocal, clientRemote };
