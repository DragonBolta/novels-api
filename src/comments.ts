import express, {NextFunction, Request, Response} from "express";
import {client} from "./db";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {ObjectId} from "mongodb";

const dbName = process.env.DB_NAME || '';

dotenv.config()

const commentsRouter = express.Router();

commentsRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, comment, novelId, chapterNum } = req.body;
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({message: 'Token is invalid or expired.'});
        return;
    }
    const access_token = authHeader.split(' ')[1]; // Assuming the format is "Bearer token"

    try {
        if (!process.env.JWT_TOKEN_SECRET) {
            throw new Error("JWT_TOKEN_SECRET is not defined");
        }

        if (!process.env.JWT_TOKEN_EXPIRATION) {
            throw new Error("JWT_TOKEN_EXPIRATION is not defined");
        }

        const payload = jwt.verify(
            access_token,
            process.env.JWT_TOKEN_SECRET,
            { maxAge: parseInt(process.env.JWT_TOKEN_EXPIRATION) }
        ) as jwt.JwtPayload;

        if (payload.username !== username) {
            throw new Error("Access token does not belong to this user");
        }

        const commentInfo = {
            username: username,
            comment: comment,
            novelId: novelId,
            chapterNum: chapterNum,
        }

        await client.connect();
        const database = client.db(dbName);
        const commentsCollection = database.collection('Comments');

        await commentsCollection.insertOne(commentInfo);

        res.status(200).json({ message: 'Successfully created comment' });
    } catch (err) {
        console.error('Error during comment creation:', err);
        res.status(401).json({ message: 'Token is invalid or expired.' });
    }
})

commentsRouter.delete('/:commentId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { commentId } = req.params;

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({message: 'Token is invalid or expired.'});
        return;
    }
    const access_token = authHeader.split(' ')[1]; // Assuming the format is "Bearer token"

    try {

        if (!process.env.JWT_TOKEN_SECRET) {
            throw new Error("JWT_TOKEN_SECRET is not defined");
        }

        if (!process.env.JWT_TOKEN_EXPIRATION) {
            throw new Error("JWT_TOKEN_EXPIRATION is not defined");
        }

        await client.connect();
        const database = client.db(dbName);
        const commentsCollection = database.collection('Comments');
        const targetComment = await commentsCollection.findOne({_id: new ObjectId(commentId)});

        if (!targetComment) {
            throw new Error("Comment does not exist");
        }

        const payload = jwt.verify(
            access_token,
            process.env.JWT_TOKEN_SECRET,
            { maxAge: parseInt(process.env.JWT_TOKEN_EXPIRATION) }
        ) as jwt.JwtPayload;

        if (payload.username !== targetComment['username']) {
            throw new Error("Comment was not created by this user");
        }

        await commentsCollection.deleteOne({_id: new ObjectId(commentId)});
        res.status(204);

    } catch (err) {
        console.error('Error during comment deletion:', err);
        res.status(404).json({ message: 'Comment does not exist.' });
    }
})



commentsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw_query = req.query;
    if (!raw_query.novelId) {
        console.error('Error during comment retrieval:', err);
        res.status(404).json({ message: 'Novel does not exist.' });
    }
    const novelId = raw_query.novelId;
    const chapterId = raw_query.chapterId ? raw_query.chapterId : "-1";

    try {

        if (!process.env.JWT_TOKEN_SECRET) {
            throw new Error("JWT_TOKEN_SECRET is not defined");
        }

        if (!process.env.JWT_TOKEN_EXPIRATION) {
            throw new Error("JWT_TOKEN_EXPIRATION is not defined");
        }

        await client.connect();
        const database = client.db(dbName);
        const commentsCollection = database.collection('Comments');
        const comments = await commentsCollection.find({novelId: novelId, chapterId: chapterId}).toArray();
        console.log(novelId);

        res.status(200).json({ message: 'Comments retrieved successfully', comments: comments});

    } catch (err) {
        console.error('Error during comment deletion:', err);
        res.status(404).json({ message: 'Comment does not exist.' });
    }
})

export default commentsRouter;