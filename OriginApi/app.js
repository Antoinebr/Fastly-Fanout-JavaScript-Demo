// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;



// CORS configuration to allow all origins, methods, and headers
app.use(cors({
    origin: '*', // Allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allows all standard methods
    allowedHeaders: '*', // Allows all headers
    exposedHeaders: ['Content-Type'], // Optionally expose specific headers to the client
}));


app.use(express.static('public'));
// Simulated in-memory data
let counter = 0;

// Object to store response objects by counter ID
const streams = {};

app.get('/', (req, res) => {
    res.send('Hello 👋');
});

// GET endpoint to stream the counter value
app.get('/counter/:id', async (req, res) => {

    counter = calculateCurrentPopulation();
    
    const counterId = req.params.id;

    console.log("Request received... " + counterId);

    // Without Fanout
    if (req.headers.accept === 'text/event-stream' && !req.get('Grip-sig')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Send headers

        // Initial data push
        res.write(`${JSON.stringify({ value: counter })}\n`);

        // Store the response for later updates
        streams[counterId] = res;

        // Cleanup when the client disconnects
        req.on('close', () => {
            delete streams[counterId];
        });

        return;
    }

    // With Fanout
    if (req.headers.accept === 'text/event-stream' && req.get('Grip-sig')) {
        console.log("All the request headers", req.headers);

        res.setHeader('Grip-Hold', 'stream');
        res.setHeader('Grip-Channel', 'counter-' + counterId);
        res.setHeader('Content-Type', 'text/event-stream');

        console.log("req.headers text/event-stream is set");

        res.status(200).end(`${JSON.stringify({ value: counter })}\n`);
    } else {
        res.json({ value: counter });
    }
});

// POST endpoint to increment the counter and notify clients
app.post('/counter/:id', async (req, res) => {
    counter = calculateCurrentPopulation();

    // Notify Fastly Fanout with the update
    await publishUpdate(counter, req.params.id);

    res.json({ value: counter });
});

app.post('/vanilla/counter/:id', async (req, res) => {
    
    counter = calculateCurrentPopulation();

    publishUpdateVanilla(counter, req.params.id);

    res.json({ value: counter });
});

const publishUpdateVanilla = (value, counterId) => {
    const stream = streams[counterId];
    if (stream) {
        stream.write(`${JSON.stringify({ value })}\n`);
    }
};

// Function to publish updates to Fastly Fanout
const publishUpdate = async (counterValue, counterId) => {
    const url = `https://api.fastly.com/service/${process.env.FASTLY_SERVICE_ID}/publish/`;

    console.log("Sending to URL", url);

    const headers = {
        'Fastly-Key': process.env.FASTLY_KEY,
        'Content-Type': 'application/json',
    };

    const data = {
        items: [
            {
                channel: `counter-${counterId}`,
                formats: {
                    'http-stream': {
                        content: `data: ${JSON.stringify({ value: counterValue })}\n\n`,
                    },
                },
            },
        ],
    };

    try {
        const res = await axios.post(url, data, { headers });
        console.log(res.status);
    } catch (error) {
        console.error('Failed to publish update:', error);
    }
};



function calculateCurrentPopulation() {
    const initialPopulation = 8170154059; // Population at 17:36:00 on August 12, 2024
    const growthRatePerSecond = 2.54;     // People per second

    // Define the time of initial population
    const initialTime = new Date('2024-08-12T17:36:00Z');
    
    // Get the current date and time
    const currentTime = new Date();
    
    // Calculate the time difference in seconds
    const timeDifferenceInSeconds = (currentTime - initialTime) / 1000;
    
    // Calculate the population increase
    const populationIncrease = timeDifferenceInSeconds * growthRatePerSecond;
    
    // Calculate the current population
    const currentPopulation = initialPopulation + populationIncrease;
    
    return Math.round(currentPopulation); // Round to nearest whole number
}

// Example usage
console.log('Current Population:', calculateCurrentPopulation());

counter = calculateCurrentPopulation();

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
