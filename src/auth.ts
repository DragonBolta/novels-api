import express, {Request, Response} from "express";
import {client} from "./db";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

const dbName = process.env.DB_NAME || ''; // Replace with your database name

dotenv.config()

const authRouter = express.Router();

authRouter.post('/register', async (req: Request, res: Response): Promise<Response | void> => {
    const { username, email, password } = req.body;

    // Manual validation logic
    if (!username || username.trim().length === 0) {
        return res.status(400).json({ message: 'Username is required and must be a non-empty string' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        await client.connect();
        const database = client.db(dbName); // Replace with your database name
        const usersCollection = database.collection('Users'); // Replace with your users collection name

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const newUser = { username, email, password };

        try {
            const saltRounds = 10;
            newUser.password = await bcrypt.hash(password, saltRounds);

            await usersCollection.insertOne(newUser);
            console.log('New user created:', newUser);
        } catch (err) {
            console.error('Error hashing password:', err);
        }

        return res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err); // Log the error for debugging
        return res.status(500).json({ message: 'Error registering user' });
    } finally {
        await client.close(); // Ensure the client is closed after the operation
    }
});

export default authRouter;