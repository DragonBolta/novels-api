//app.ts
import * as fs from "node:fs";
import path from 'path';
import express, {Request, Response} from 'express'; // Import Request and Response types
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config()

const app = express();
const PORT = process.env.PORT || 3000;

const novel_path = path.resolve(process.env.NOVEL_PATH || "./../Test_Novels")

// Use CORS middleware
app.use(cors({
    origin: [`${process.env.SITE_URL}:${process.env.SITE_PORT}`,'http://localhost:5173'], // Replace with your frontend URL
}));

// MongoDB connection URI and database/collection names
const uri = process.env.DB_URL || 'mongodb://localhost:27017'; // Replace with your MongoDB connection string
const dbName = process.env.DB_NAME || ''; // Replace with your database name
const collectionName = process.env.COLLECTION_NAME || ''; // Replace with your collection name

// Create a MongoClient instance
const client = new MongoClient(uri);


// Route to list documents in novel collection
app.get('/api/novels', async (req: Request, res: Response) => {
    try {
        // Connect to the MongoDB client
        await client.connect();

        // Access the specified database and collection
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Find all documents in the collection
        const novels = await collection.find({}).toArray();

        // Respond with the array of novels
        res.json(novels);
    } catch (error) {
        console.error('Error fetching novels:', error);
        res.status(500).json({ error: 'Failed to retrieve novels' });
    } finally {
        // Ensure the client is closed when done
        await client.close();
    }
});

app.get('/api/:novelName/cover', async (req: Request, res: Response) => {
    const {novelName} = req.params;
    const filePath: string = path.join(novel_path, novelName, `Cover.png`); // Update file extension if necessary

    try {
        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Set the Content-Type header and send the image
            res.setHeader('Content-Type', 'image/png'); // Adjust for the correct image type
            res.sendFile(filePath);
        } else {
            // Handle case when file is not found
            res.status(404).json({error: `Cover image for ${novelName} not found`});
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        // Send a 500 error for unexpected issues
        res.status(500).json({error: 'Failed to send cover'});
    }
});

// Route to read a specific chapter of a novel
app.get('/api/:novelName/:chapterNumber', async (req: Request, res: Response) => {
    const {novelName, chapterNumber} = req.params;

    // Construct the file path
    const filePath = path.join(novel_path, novelName, "Markdown", novelName + ` Chapter ${chapterNumber}.md`); // Adjust the file extension as necessary

    try {
        // Read the file asynchronously
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                // Handle file not found or read errors
                if (err.code === 'ENOENT') {
                    return res.status(404).json({error: `${filePath} ` + 'Chapter not found'});
                }
                console.error(`Error reading file: ${err.message}`);
                return res.status(500).json({error: 'Error reading chapter'});
            }

            // Send the chapter content as a response
            res.json({content: data});
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({error: `Failed to retrieve chapter`});
    }
});

// Route to get info of a novel
app.get('/api/:novelName/', async (req: Request, res: Response) => {
    const {novelName} = req.params;
    try {
        // Connect to the MongoDB client
        await client.connect();

        // Access the specified database and collection
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Find all documents in the collection
        const novels = await collection.find({"title_english": novelName}).toArray();

        // Respond with the array of novels
        res.json(novels);
    } catch (error) {
        console.error('Error fetching novels:', error);
        res.status(500).json({ error: 'Failed to retrieve novels' });
    } finally {
        // Ensure the client is closed when done
        await client.close();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// module.exports = app(); // Not needed if using ES modules
