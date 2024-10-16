// MongoDB connection URI and database/collection names
import {MongoClient} from "mongodb";
import dotenv from "dotenv";

const uri = process.env.DB_URL || 'mongodb://localhost:27017'; // Replace with your MongoDB connection string

// Create a MongoClient instance
const client = new MongoClient(uri);

dotenv.config()

let connected = false;

async function connectToDatabase() {
    if (!connected) { // Prevent multiple connections
        try {
            await client.connect();
            console.log('Connected to MongoDB');
            connected = true;
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            process.exit(1); // Exit if connection fails
        }
    }
    return client; // Return the database instance
}

// Export the connection function and the client
export { connectToDatabase, client };