require('dotenv').config();

const { clientLocal } = require('./db');

const puppeteer = require('puppeteer');
const { BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');


async function getBooks() {
    const response = { statusCode: 200 };

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
        });
        const page = await browser.newPage();

        const url = process.env.URL + '/books';
        await page.goto(url);

        new Promise(r => setTimeout(r, 2000));

        const items = await page.$$eval('div#gridItemRoot > div > div > div:nth-child(2) > div', (elements) => {
            // Function to return an uuid v4
            function uuidv4() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (Math.random() * 16) | 0,
                        v = c == 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                });
            }

            // Use .map to process each element individually
            return elements.slice(0, 3).map((element, index) => {
                const category = 'books';

                // One must know how many child nodes the element has because the length can vary
                // but price is always the last child
                const length = element.childNodes.length;

                // Generate the date
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const dateToDB = yesterday.toISOString().slice(0, 10);

                // Get the title of the item
                const titleElement = element.querySelector('a:nth-child(2)');
                const title = titleElement ? titleElement.textContent.trim() : 'No title available';

                // Get the author of the book
                const authorElement = element.querySelector('div:nth-child(3)');
                const author = authorElement ? authorElement.textContent.trim() : 'No author available';

                // Get the price of the item which will be always the last child of the div
                const priceElement = element.querySelector('div:nth-child(' + length + ')');
                const priceString = priceElement ? priceElement.textContent.trim() : 'No price available';
                // Remove periods and commas to have the price so one can store it as integers
                const price = priceString.slice(3).replace(/[.,]/g, '');

                // Set the ranking of the item
                const ranking = index + 1;

                const id = uuidv4();

                return {
                    // That is the object which can be inserted to the DynamoDB even in BatchWriteItem
                    PutRequest: {
                        Item: {
                            'itemId': {'S': id},
                            'title': {'S': title},
                            'author': {'S': author},
                            'price': {'N': price},
                            'dateOfInsertion': {'S': dateToDB},
                            'category': {'S': category},
                            'rankingMarket': {'S': ranking.toString()},
                        },
                    }
                };
            })
        });
        await browser.close();

        // Put every element of structuredData inside toWrite
        const toWrite = Array.from(structuredData);

        const params = {
            RequestItems: {
                'items-table-dev': toWrite
            },
        };

        const batchWriteResult = await clientLocal.send(new BatchWriteItemCommand(params));

        response.body = JSON.stringify({
            message: 'Web scrapping successful - books.',
        });

    } catch (error) {
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: 'Failed to scrap books.',
            errorMsg: error.message,
            errorStack: error.stack,
        })
    } finally {
        return response;
    }
};


async function getGeneral(category) {
    const response = { statusCode: 200 };

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
        });
        const page = await browser.newPage();

        // Replace the URL with the website you want to scrape
        const url = `${process.env.URL}/${category}`;
        await page.goto(url);

        new Promise(r => setTimeout(r, 2000));

        const structuredData = await page.$$eval('div#gridItemRoot > div > div > div:nth-child(2) > div', (elements, category) => {
            function uuidv4() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (Math.random() * 16) | 0,
                        v = c == 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                });
            }

            // Use map to process each element individually
            return elements.slice(0, 3).map((element, index) => {
                // How many childs the div has
                const length = element.childNodes.length;

                // Generate the date
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const dateToDB = yesterday.toISOString().slice(0, 10);

                // Get the title of the item
                const titleElement = element.querySelector('a:nth-child(2)');
                const title = titleElement ? titleElement.textContent.trim() : 'No title available';

                // Get the price of the item which will be always the last child of the div
                const priceElement = element.querySelector('div:nth-child(' + length + ')');
                const priceString = priceElement ? priceElement.textContent.trim() : 'No price available';
                // Remove periods and commas to have the price
                const price = priceString.slice(3).replace(/[.,]/g, '');

                // Set the ranking of the item
                const ranking = index + 1;

                const id = uuidv4();

                return {
                    // That is the object which can be inserted to the DynamoDB even in BatchWriteItem
                    PutRequest: {
                        Item: {
                            'itemId': {'S': id},
                            'title': {'S': title},
                            'price': {'N': price},
                            'dateOfInsertion': {'S': dateToDB},
                            'category': {'S': category},
                            'rankingMarket': {'S': ranking.toString()},
                        },
                    }
                };
            });
        }, category);
        await browser.close();
        
        // Put every element of structuredData inside toWrite
        const toWrite = Array.from(structuredData);

        const params = {
            RequestItems: {
                'items-table-dev': toWrite
            },
        };

        const createResult = await client.send(new BatchWriteItemCommand(params));

        response.body = JSON.stringify({
            message: `Web scraping successful - ${category}.`,
        });

    } catch (error) {
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: `Failed to scrap ${category}.`,
            errorMsg: error.message,
            errorStack: error.stack,
        })
    } finally {
        return response;
    }
};


module.exports = {
    getBooks,
    getGeneral,
};
