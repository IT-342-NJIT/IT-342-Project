/**
 * TireMatch - Tire Search Lambda with DynamoDB Integration + GZIP Support
 * Compatible with Node.js 20.x runtime (AWS SDK v3)
 */

const https = require('https');
const zlib = require('zlib');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// Configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const DYNAMODB_TABLE = 'VehicleTireSizes';

exports.handler = async (event) => {
    console.log('========================================');
    console.log('RECEIVED EVENT:', JSON.stringify(event, null, 2));
    console.log('========================================');
    
    try {
        // Parse the incoming request
        const body = JSON.parse(event.body);
        const { year, make, model } = body;
        
        console.log('Parsed body:', { year, make, model });
        console.log('eBay App ID:', EBAY_APP_ID ? 'SET' : 'NOT SET');
        
        // Validate required fields
        if (!year || !make || !model) {
            console.log('ERROR: Missing required fields');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields: year, make, and model are required'
                })
            };
        }
        
        console.log(`Step 1: Looking up tire size for: ${year} ${make} ${model}`);
        
        // Step 1: Look up tire size in DynamoDB
        const tireSize = await getTireSizeFromDB(year, make, model);
        
        if (!tireSize) {
            console.log('Vehicle not found in database');
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: `Tire size not found for ${year} ${make} ${model}. Try searching by tire size instead.`,
                    vehicleNotFound: true
                })
            };
        }
        
        console.log(`Step 2: Found tire size: ${tireSize}`);
        console.log(`Step 3: Searching eBay for tire size: ${tireSize}`);
        
        // Step 2: Search eBay for tires by size
        const tires = await searchEbayByTireSize(tireSize);
        
        console.log(`Successfully found ${tires.length} tires`);
        
        // Return success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                vehicle: `${year} ${make} ${model}`,
                tireSize: tireSize,
                count: tires.length,
                results: tires
            })
        };
        
    } catch (error) {
        console.error('========================================');
        console.error('MAIN HANDLER ERROR:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('========================================');
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message || 'An error occurred while searching for tires'
            })
        };
    }
};

/**
 * Look up tire size from DynamoDB (AWS SDK v3)
 */
async function getTireSizeFromDB(year, make, model) {
    const vehicleKey = `${year}-${make}-${model}`;
    
    console.log(`Querying DynamoDB for vehicleKey: ${vehicleKey}`);
    
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: {
                vehicleKey: vehicleKey
            }
        };
        
        const command = new GetCommand(params);
        const result = await dynamodb.send(command);
        
        if (result.Item) {
            console.log('Found in DynamoDB:', JSON.stringify(result.Item, null, 2));
            return result.Item.tireSize;
        } else {
            console.log('Vehicle not found in DynamoDB');
            return null;
        }
        
    } catch (error) {
        console.error('DynamoDB error:', error);
        throw new Error('Database lookup failed');
    }
}

/**
 * Search eBay for tires by tire size (WITH GZIP SUPPORT)
 */
async function searchEbayByTireSize(tireSize) {
    return new Promise((resolve, reject) => {
        // Search for the specific tire size
        const searchQuery = `${tireSize} tire`;
        const encodedQuery = encodeURIComponent(searchQuery);
        
        // eBay Finding API endpoint
        const path = `/services/search/FindingService/v1?` +
                    `OPERATION-NAME=findItemsByKeywords` +
                    `&SERVICE-VERSION=1.0.0` +
                    `&SECURITY-APPNAME=${EBAY_APP_ID}` +
                    `&RESPONSE-DATA-FORMAT=JSON` +
                    `&REST-PAYLOAD` +
                    `&keywords=${encodedQuery}` +
                    `&paginationInput.entriesPerPage=30` +
                    `&categoryId=66471` +  // Tires category
                    `&sortOrder=BestMatch`;
        
        console.log('========================================');
        console.log('CALLING EBAY API');
        console.log('Hostname: svcs.ebay.com');
        console.log('Search query:', searchQuery);
        console.log('========================================');
        
        const options = {
            hostname: 'svcs.ebay.com',
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate'  // Tell eBay we accept gzip
            }
        };
        
        const req = https.request(options, (res) => {
            console.log('eBay API Response Status Code:', res.statusCode);
            console.log('Content-Encoding:', res.headers['content-encoding']);
            
            // Handle gzip-compressed responses
            let stream = res;
            const encoding = res.headers['content-encoding'];
            
            if (encoding === 'gzip') {
                console.log('Response is GZIP compressed - decompressing...');
                stream = res.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                console.log('Response is DEFLATE compressed - decompressing...');
                stream = res.pipe(zlib.createInflate());
            } else {
                console.log('Response is not compressed');
            }
            
            let data = '';
            
            stream.on('data', (chunk) => {
                data += chunk.toString();
            });
            
            stream.on('end', () => {
                try {
                    console.log('Received data length:', data.length);
                    console.log('First 200 chars:', data.substring(0, 200));
                    
                    const response = JSON.parse(data);
                    
                    // Check for errors
                    if (response.errorMessage) {
                        console.error('eBay API returned error:', response.errorMessage);
                        reject(new Error(response.errorMessage[0].error[0].message[0]));
                        return;
                    }
                    
                    // Extract items from response
                    const searchResult = response.findItemsByKeywordsResponse[0].searchResult[0];
                    const itemCount = searchResult['@count'];
                    const items = searchResult.item || [];
                    
                    console.log(`eBay returned ${itemCount} items`);
                    
                    if (items.length === 0) {
                        console.log('No items found');
                        resolve([]);
                        return;
                    }
                    
                    // Format the results
                    const formattedTires = items.map(item => {
                        return {
                            id: item.itemId[0],
                            name: item.title[0],
                            brand: extractBrand(item.title[0]),
                            price: parseFloat(item.sellingStatus[0].currentPrice[0].__value__),
                            currency: item.sellingStatus[0].currentPrice[0]['@currencyId'],
                            image: item.galleryURL ? item.galleryURL[0] : (item.pictureURLLarge ? item.pictureURLLarge[0] : ''),
                            size: tireSize,
                            url: item.viewItemURL[0],
                            condition: item.condition ? item.condition[0].conditionDisplayName[0] : 'New',
                            shipping: item.shippingInfo && item.shippingInfo[0].shippingServiceCost 
                                ? parseFloat(item.shippingInfo[0].shippingServiceCost[0].__value__) 
                                : 0,
                            location: item.location ? item.location[0] : ''
                        };
                    });
                    
                    console.log(`Successfully formatted ${formattedTires.length} tires`);
                    console.log('Sample tire:', JSON.stringify(formattedTires[0], null, 2));
                    resolve(formattedTires);
                    
                } catch (err) {
                    console.error('ERROR PARSING EBAY RESPONSE:', err);
                    console.error('Raw data length:', data.length);
                    console.error('Raw data sample:', data.substring(0, 500));
                    reject(new Error('Failed to parse eBay response'));
                }
            });
            
            stream.on('error', (err) => {
                console.error('STREAM ERROR:', err);
                reject(err);
            });
        });
        
        req.on('error', (err) => {
            console.error('HTTPS REQUEST ERROR:', err);
            reject(err);
        });
        
        req.end();
    });
}

/**
 * Extract brand from title
 */
function extractBrand(title) {
    const brands = [
        'Goodyear', 'Michelin', 'Bridgestone', 'Continental', 
        'Pirelli', 'Dunlop', 'Firestone', 'Yokohama', 'Hankook',
        'Cooper', 'BFGoodrich', 'BF Goodrich', 'Toyo', 'Falken', 
        'Kumho', 'Nexen', 'General', 'Uniroyal', 'Nitto',
        'Mickey Thompson', 'Dick Cepek', 'Mastercraft', 'Fuzion',
        'Sumitomo', 'Federal', 'Maxxis', 'GT Radial', 'Kenda',
        'Atturo', 'Lexani', 'Vercelli', 'Ironman', 'Hercules'
    ];
    
    const upperTitle = title.toUpperCase();
    
    for (const brand of brands) {
        if (upperTitle.includes(brand.toUpperCase())) {
            return brand;
        }
    }
    
    // If no brand found, try to extract first capitalized word
    const words = title.split(' ');
    for (const word of words) {
        if (word.length > 2 && word[0] === word[0].toUpperCase()) {
            return word;
        }
    }
    
    return 'Various';
}