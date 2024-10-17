import express, {NextFunction, Request, Response} from "express";
import {client} from "./db";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const dbName = process.env.DB_NAME || '';

dotenv.config()

const authRouter = express.Router();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, email, password } = req.body;

    // Manual validation logic
    if (!username || username.trim().length === 0) {
        res.status(400).json({ message: 'Username is required and must be a non-empty string' });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        res.status(400).json({ message: 'Valid email is required' });
        return;
    }

    if (!password || password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters long' });
        return;
    }

    try {
        await client.connect();
        const database = client.db(dbName);
        const usersCollection = database.collection('Users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Check if user already exists
        const usernameTaken = await usersCollection.findOne({"username": username });
        if (usernameTaken) {
            res.status(400).json({ message: 'Username is taken' });
            return;
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
            res.status(500).json({ message: 'Error registering user' });
        }

        res.status(201).json({ message: 'User registered successfully' });
        return;
    } catch (err) {
        console.error(err); // Log the error for debugging
        res.status(500).json({ message: 'Error registering user' });
    }
    next();
});

// Login route
authRouter.post('/login', async (req, res, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;


    await client.connect();
    const database = client.db(dbName);
    const usersCollection = database.collection('Users');
    const user = await usersCollection.findOne({"email": email});

    if (!user) {
        res.status(401).json({ message: 'Invalid email or password.' });
        return;
    }

    try {
        // Compare the hashed password with the provided password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid email or password.' });
            return;
        }

        if (!process.env.JWT_TOKEN_SECRET) {
            throw new Error("JWT_TOKEN_SECRET is not defined");
        }

        if (!process.env.JWT_TOKEN_EXPIRATION) {
            throw new Error("JWT_TOKEN_EXPIRATION is not defined");
        }

        // Create a JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_TOKEN_SECRET, {
            expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRATION), // Token expiration time
        });

        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error("JWT_REFRESH_SECRET is not defined");
        }

        if (!process.env.JWT_REFRESH_EXPIRATION) {
            throw new Error("JWT_REFRESH_EXPIRATION is not defined");
        }

        // Create a JWT token
        const refreshToken = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION), // Token expiration time
        });

        // Send the token in the response
        res.json({ message: 'Login successful!', token , refreshToken});
        return;

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
    next();
});

authRouter.post('/refreshToken', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { refresh_token } = req.body;
    try {

        if (!process.env.JWT_TOKEN_SECRET) {
            throw new Error("JWT_TOKEN_SECRET is not defined");
        }

        if (!process.env.JWT_TOKEN_EXPIRATION) {
            throw new Error("JWT_TOKEN_EXPIRATION is not defined");
        }

        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error("JWT_REFRESH_SECRET is not defined");
        }

        if (!process.env.JWT_REFRESH_EXPIRATION) {
            throw new Error("JWT_REFRESH_EXPIRATION is not defined");
        }

        const payload = jwt.verify(
            refresh_token,
            process.env.JWT_REFRESH_SECRET,
            { maxAge: parseInt(process.env.JWT_REFRESH_EXPIRATION) }
        ) as jwt.JwtPayload;

        // Example: Issue a new access token
        const newAccessToken = jwt.sign(
            { id: payload.id, username: payload.username },
            process.env.JWT_TOKEN_SECRET,
            { expiresIn: process.env.JWT_TOKEN_EXPIRATION }
        );

        res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
        console.error('Error during token refresh:', err);
        res.status(401).json({ message: 'Token is invalid or expired.' });
    }
});


export default authRouter;