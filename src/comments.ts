import express, {NextFunction, Request, Response} from "express";
import {client} from "./db";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import {ObjectId} from "mongodb";
import {body, param, query, validationResult} from "express-validator";
import createDOMPurify from 'dompurify';
import { JSDOM } from "jsdom";

const dbName = process.env.DB_NAME || '';

dotenv.config()

const commentsRouter = express.Router();

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

commentsRouter.post('/',
    [
        body('username').custom((value: any) => typeof value === 'string').trim().notEmpty().withMessage('Username is required'),
        body('comment').custom((value: any) => typeof value === 'string').trim().notEmpty().withMessage('Comment is required'),
        body('novelId').custom((value: any) => typeof value === 'string').notEmpty().withMessage('Novel ID is required'),
        body('chapterNumber').isInt().withMessage('Chapter number must be an integer'),
    ], async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    const { username, comment, novelId, chapterNumber } = req.body;
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

        const sanitizedComment = DOMPurify.sanitize(comment);

        const commentInfo = {
            username: username,
            comment: sanitizedComment,
            novelId: novelId,
            chapterNumber: chapterNumber,
            timestamp: new Date()
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

commentsRouter.delete('/:commentId',
    [
        param('commentId').custom((value: any) => typeof value === "string").trim().notEmpty().withMessage('commentId is required')
    ], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { commentId } = req.params;

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({message: 'Token is invalid or expired.'});
        return;
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: 'Invalid token format.' });
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
        if (!ObjectId.isValid(commentId)) {
            res.status(400).json({ message: 'Invalid comment ID format' });
            return
        }
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

        if (!ObjectId.isValid(commentId)) {
            res.status(400).json({ message: 'Invalid comment ID format' });
            return
        }

        await commentsCollection.deleteOne({_id: new ObjectId(commentId)});
        res.status(204).json({ message: 'Successful deletion' });
    } catch (err) {
        console.error('Error during comment deletion:', err);
        res.status(404).json({ message: 'Comment does not exist.' });
    }
})



commentsRouter.get('/',
    [
        query('novelId').custom((value: any) => typeof value === "string").trim().notEmpty().withMessage('novelId is required'),
        query('chapterNumber').custom((value: any) => typeof value === "string").trim().notEmpty().withMessage('chapterId is required')
    ], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw_query = req.query;
    const novelId = raw_query.novelId;
    const chapterNumber = raw_query.chapterNumber ? raw_query.chapterNumber : "-1";

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
        const comments = await commentsCollection.find({novelId: novelId, chapterNumber: chapterNumber}).toArray();
        res.status(200).json({ message: 'Comments retrieved successfully', comments: comments});

    } catch (err) {
        console.error('Error during comment deletion:', err);
        res.status(404).json({ message: 'Comment does not exist.' });
    }
})

export default commentsRouter;