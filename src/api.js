require('dotenv').config();

const { clientRemote } = require('./db');
const { ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');


const getData = async (event) => {
    const response = { statusCode: 200 };

    try {
        // Used to check if the user passed filters as query parameters
        const filterAttributes = {};
        const filterExpressionParts = [];
        const expressionAttributeValues = {};

        // The object 'queryStringParameters' only exists if at least one query parameter is passed
        // Therefore, it is necessary to check for its existence before proceeding
        if (event.queryStringParameters) {
            if (event.queryStringParameters.category !== undefined) {
                filterAttributes[':category'] = { S: event.queryStringParameters.category };
            }
        
            if (event.queryStringParameters.date !== undefined) {
                filterAttributes[':dateOfInsertion'] = { S: event.queryStringParameters.date };
            }
        
            if (filterAttributes[':category']) {
                filterExpressionParts.push('category = :category');
                expressionAttributeValues[':category'] = filterAttributes[':category'];
            }
        
            if (filterAttributes[':dateOfInsertion']) {
                filterExpressionParts.push('dateOfInsertion = :dateOfInsertion');
                expressionAttributeValues[':dateOfInsertion'] = filterAttributes[':dateOfInsertion'];
            }
        }

        // Set the parameters to execute the Scan
        const scanParams = {
            TableName: `${process.env.TABLE_NAME}-dev`,
            // Ternary operators for simplicity
            FilterExpression: filterExpressionParts.length > 0 ? filterExpressionParts.join(' AND ') : undefined,
            ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        };

        const { Items } = await clientRunAWS.send(new ScanCommand(scanParams));

        response.body = JSON.stringify({
            message: 'Successfully retrieved items.',
            data: Items.map((item) => unmarshall(item)),
        });

    } catch (error) {
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: 'Failed to retrieve items.',
            errorMsg: error.message,
            errorStack: error.stack,
        });

    } finally {
        return response;
    }
};


module.exports = { getData };