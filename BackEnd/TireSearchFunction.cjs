/**
 * TireMatch - Tire Search Lambda with DynamoDB + ENHANCED MOCK TIRE DATA
 * Uses real DynamoDB lookup, returns realistic mock tire data with variety
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// Configuration
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
        
        let tireSize;
        
        // Check if this is a direct tire size search
        // Tire sizes have format: 195/35R14 or 195/35r14
        if (model && model.match(/^\d{3}\/\d{2}[rR]\d{2}$/)) {
            console.log('Direct tire size search detected:', model);
            tireSize = model.toUpperCase(); // Normalize to uppercase
        } else {
            // Step 1: Look up tire size in DynamoDB
            tireSize = await getTireSizeFromDB(year, make, model);
        }
        
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
        console.log(`Step 3: Generating mock tire data for: ${tireSize}`);
        
        // Step 2: Generate mock tire data
        const tires = generateMockTireData(tireSize);
        
        console.log(`Successfully generated ${tires.length} tires`);
        
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
 * Generate realistic mock tire data with variety based on tire size
 * Different sizes get different brand mixes and price ranges
 */
function generateMockTireData(tireSize) {
    // Create a deterministic seed based on tire size for consistency
    const seed = tireSize.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Seeded random number generator for consistent results per tire size
    let seedValue = seed;
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };
    
    // Different brand pools for variety
    const premiumBrands = ['Michelin', 'Continental', 'Pirelli', 'Bridgestone'];
    const standardBrands = ['Goodyear', 'Firestone', 'Dunlop', 'Yokohama', 'Hankook'];
    const budgetBrands = ['Cooper', 'General', 'Uniroyal', 'Mastercraft', 'Federal'];
    const performanceBrands = ['BFGoodrich', 'Toyo', 'Falken', 'Nitto', 'Nexen'];
    const offRoadBrands = ['BFGoodrich', 'Goodyear', 'Mickey Thompson', 'Toyo', 'Nitto'];
    
    // Tire models categorized by type
    const touringModels = ['Defender', 'Premier', 'Assurance', 'Turanza', 'CrossClimate', 'PureContact'];
    const performanceModels = ['Pilot Sport', 'Eagle F1', 'P Zero', 'Potenza', 'ExtremeContact', 'Sport Maxx'];
    const allSeasonModels = ['Assurance', 'Defender', 'LTX', 'CrossClimate', 'Tiger Paw', 'Ecopia'];
    const truckModels = ['Wrangler', 'Dueler', 'LTX', 'Geolandar', 'Open Country', 'Trail Hog'];
    
    // Determine tire category based on size
    const width = parseInt(tireSize.split('/')[0]);
    const aspectRatio = parseInt(tireSize.split('/')[1]);
    const rimSize = parseInt(tireSize.split('R')[1]);
    
    let brandPool, modelPool, priceMin, priceMax;
    
    // Categorize by size characteristics
    if (width >= 275 && rimSize >= 18) {
        // Large truck/SUV tires
        brandPool = [...offRoadBrands, ...premiumBrands];
        modelPool = truckModels;
        priceMin = 150;
        priceMax = 350;
    } else if (aspectRatio <= 45 && rimSize >= 18) {
        // Performance tires
        brandPool = [...performanceBrands, ...premiumBrands];
        modelPool = performanceModels;
        priceMin = 120;
        priceMax = 300;
    } else if (width >= 245 && rimSize >= 17) {
        // Mid-size SUV/Crossover
        brandPool = [...standardBrands, ...premiumBrands];
        modelPool = [...allSeasonModels, ...touringModels];
        priceMin = 100;
        priceMax = 250;
    } else if (rimSize <= 16 && width <= 215) {
        // Compact/economy car
        brandPool = [...budgetBrands, ...standardBrands];
        modelPool = [...touringModels, ...allSeasonModels];
        priceMin = 60;
        priceMax = 150;
    } else {
        // Standard passenger car
        brandPool = [...standardBrands, ...premiumBrands, ...budgetBrands];
        modelPool = [...touringModels, ...allSeasonModels];
        priceMin = 80;
        priceMax = 200;
    }
    
    const conditions = ['New', 'New', 'New', 'New', 'Like New', 'Used'];
    const locations = [
        'Los Angeles, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX',
        'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'Dallas, TX',
        'San Diego, CA', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
        'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'Seattle, WA',
        'Denver, CO', 'Boston, MA', 'Portland, OR', 'Las Vegas, NV'
    ];
    
    const tires = [];
    
    for (let i = 0; i < 30; i++) {
        const brand = brandPool[Math.floor(seededRandom() * brandPool.length)];
        const model = modelPool[Math.floor(seededRandom() * modelPool.length)];
        const condition = conditions[Math.floor(seededRandom() * conditions.length)];
        const location = locations[Math.floor(seededRandom() * locations.length)];
        
        // Price varies based on category and condition
        let basePrice = priceMin + seededRandom() * (priceMax - priceMin);
        
        // Adjust price for condition
        if (condition === 'Used') {
            basePrice *= 0.6;
        } else if (condition === 'Like New') {
            basePrice *= 0.85;
        }
        
        const price = Math.round(basePrice * 100) / 100;
        
        // Shipping varies by price
        let shipping;
        if (price < 100) {
            shipping = [0, 0, 15][Math.floor(seededRandom() * 3)];
        } else if (price < 200) {
            shipping = [0, 15, 25][Math.floor(seededRandom() * 3)];
        } else {
            shipping = [0, 25, 35][Math.floor(seededRandom() * 3)];
        }
        
        // Generate deterministic item ID based on tire size and index
        const itemId = `${Math.floor((seed + i * 1000) % 900000000) + 100000000}`;
        
        // Country of manufacture based on brand
        let madeIn;
        if (['Michelin', 'Continental', 'Pirelli'].includes(brand)) {
            madeIn = ['France', 'Germany', 'Italy'][Math.floor(seededRandom() * 3)];
        } else if (['Bridgestone', 'Yokohama', 'Toyo'].includes(brand)) {
            madeIn = 'Japan';
        } else if (['Goodyear', 'Firestone', 'BFGoodrich', 'Cooper', 'General'].includes(brand)) {
            madeIn = 'USA';
        } else if (['Hankook', 'Nexen', 'Kumho'].includes(brand)) {
            madeIn = 'South Korea';
        } else {
            madeIn = ['USA', 'Mexico', 'China', 'Thailand'][Math.floor(seededRandom() * 4)];
        }
        
        tires.push({
            id: itemId,
            name: `${brand} ${model} ${tireSize} Tire`,
            brand: brand,
            model: model,  // Separate model field
            madeIn: madeIn,  // Country of manufacture
            price: price,
            currency: 'USD',
            image: `https://i.ebayimg.com/images/g/${itemId}/s-l300.jpg`,
            size: tireSize,
            url: `https://www.ebay.com/itm/${itemId}`,
            condition: condition,
            shipping: shipping,
            location: location
        });
    }
    
    return tires;
}