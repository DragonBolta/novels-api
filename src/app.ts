//app.ts
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import novelRouter from "./novelsRouter";
import {connectToDatabase} from "./db";
import authRouter from "./auth";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 3000;

const novel_path = process.env.NOVEL_PATH
    ? path.resolve(process.env.NOVEL_PATH)
    : path.resolve(__dirname, './../Test_Novels'); // Ensure fallback is correct
console.log('Resolved path:', novel_path);

// Use CORS middleware
app.use(cors({
    origin: [`${process.env.SITE_URL}`, 'http://localhost:5173', 'http://localhost:4173'], // Replace with your frontend URL
}));

app.use(express.json())

app.use('/', novelRouter);

app.use('/auth', authRouter);

// Start the server
app.listen(PORT, async () => {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
});

// module.exports = app(); // Not needed if using ES modules
