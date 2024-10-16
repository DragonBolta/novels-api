//novelsRouter.js
import * as fs from "node:fs";
import path from 'path';
import express, {Request, Response} from 'express'; // Import Request and Response types
import {client} from './db';
import {Filter} from 'mongodb';
import {fileURLToPath} from "node:url";
import dotenv from "dotenv";

const novel_path = process.env.NOVEL_PATH
    ? path.resolve(process.env.NOVEL_PATH)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), './../Test_Novels'); // Ensure fallback is correct
console.log('Resolved path:', novel_path);

const dbName = process.env.DB_NAME || ''; // Replace with your database name
const collectionName = process.env.COLLECTION_NAME || ''; // Replace with your collection name

dotenv.config()

const novelRouter = express.Router();

// Route to get a random novel
novelRouter.get('/api/random', async (req: Request, res: Response) => {
    try {

        // Access the database and collection
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Use aggregation with $sample to retrieve one random document
        const randomDocument = await collection.aggregate([{$sample: {size: 1}}]).toArray();

        if (randomDocument.length > 0) {
            res.json(randomDocument[0]); // Return the random document
        } else {
            res.status(404).json({message: 'No novels found'}); // Handle case where no document is found
        }
    } catch (error) {
        console.error('Error fetching random document:', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// Route to search for a novel with filters
novelRouter.get('/api/query', async (req: Request, res: Response) => {
    const raw_query = req.query;

    const page = typeof raw_query.page === "string" ? parseInt(raw_query.page) : 1; // Current page number, default to 1
    const pageSize = typeof raw_query.pageSize !== "string"
        ? 100
        : parseInt(raw_query.pageSize) <= 100
            ? parseInt(raw_query.pageSize)
            : 100; // Number of items per page, default to 10
    const skip = (page - 1) * pageSize; // Calculate skip value

    // Define the filter object with $and initialized
    let filter: Filter<any> = {
        $and: [] // Ensure this is initialized as an array
    };

    if (Array.isArray(filter.$and)) {
        if (raw_query.likes) {
            filter.$and.push({likes: {$gte: parseInt(raw_query.likes as string, 10)}});
        }

        if (raw_query.rating) {
            filter.$and.push({rating: {$gte: parseFloat(raw_query.rating as string)}});
        }

        // Ensure multiple tags for inclusion are handled correctly using regex for case-insensitivity
        if (raw_query.tags) {
            let tagsArray =
                Array.isArray(raw_query.tags)
                    ? raw_query.tags.map(tag => tag as string)
                    : raw_query.tags
                        ? [raw_query.tags as string]
                        : [];

            // Create an array of regex filters for case-insensitive matching
            const regexFilters = tagsArray.map(tag => ({
                tags: { $regex: new RegExp(`^${tag}$`, 'i') } // Matches the exact tag, case-insensitive
            }));

            // Use $and to combine all regex conditions
            filter.$and.push({ $and: regexFilters });
        }

        if (raw_query.nsfw !== "true") {
            // Exclude the "Adult" tag, case-insensitive
            filter.$and.push({
                tags: { $not: { $regex: new RegExp('^Adult$', 'i') } } // Excludes the exact "Adult" tag
            });
        }

        // Handle multiple tags for exclusion using $nin with regex
        if (raw_query.tags_exclude) {
            let tagsExcludeArray: string[]=
                Array.isArray(raw_query.tags_exclude)
                    ? raw_query.tags_exclude.map(tag => tag as string)
                    : raw_query.tags_exclude
                        ? [raw_query.tags_exclude as string]
                        : [];

            // Create an array of regex filters for exclusion
            const regexExcludeFilters = tagsExcludeArray.map(tag => ({
                tags: { $not: { $regex: new RegExp(`^${tag}$`, 'i') } } // Excludes exact matches, case-insensitive
            }));

            // Use $or to combine all exclusion conditions
            filter.$and.push({ $or: regexExcludeFilters });
        }

        // Add remaining string-based filters for all other query parameters
        Object.keys(raw_query).forEach((key) => {
            if (key !== 'likes' && key !== 'rating' && key !== 'tags' && key !== 'tags_exclude' && key !== 'nsfw' && key != 'page' && key != 'pageSize') {
                const value = raw_query[key];
                if (typeof value === 'string') {
                    // Use regex for partial matching (case-insensitive)
                    // @ts-ignore
                    filter.$and.push({ [key]: { $regex: value, $options: 'i' } });
                }
            }
        });

        // If no conditions are added to the $and array, handle accordingly
        if (filter.$and.length === 0) {
            // Optionally, you could set the filter to an empty object or handle it based on your needs
            filter.$and.push({likes: {$gte: 0}});
        }
    }
    try {

        // Access the database and collection
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const pipeline = [
            { $match: filter }, // Match with the constructed filter
            {
                $addFields: {
                    titleExactMatch: {
                        $cond: {
                            if: {
                                $regexMatch: {
                                    input: "$title_english",
                                    regex: `^${raw_query.title_english}$`, // Exact match with regex
                                    options: "i" // Case-insensitive
                                }
                            },
                            then: 1, // Exact matches get priority 1
                            else: 0  // Non-exact matches get priority 0
                        }
                    },
                    titleWholeWordMatch: {
                        $cond: {
                            if: {
                                $regexMatch: {
                                    input: "$title_english",
                                    regex: `\\b${raw_query.title_english}\\b`, // Whole word match with regex
                                    options: "i" // Case-insensitive
                                }
                            },
                            then: 1, // Whole word matches get priority 1
                            else: 0  // Non-whole word matches get priority 0
                        }
                    },
                    titleLength: { $strLenCP: "$title_english" } // Get the length of the title
                }
            },
            {
                $sort: {
                    titleExactMatch: -1,
                    likes: -1,
                    titleWholeWordMatch: -1,
                    titleLength: 1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: pageSize // Limit results
            }
        ]

        // Perform the search with the constructed filter and sort by `likes` in descending order
        const search_results = await collection.aggregate(pipeline).toArray();

        const totalCount = await collection.countDocuments(filter); // Get total count for pagination

        res.json({
            search_results,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
        });
    } catch (error) {
        console.error('Error fetching random document:', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// Route to get info of a novel
novelRouter.get('/api/:novelName', async (req: Request, res: Response) => {
    const { novelName } = req.params;
    try {
        // Access the specified database and collection
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const pipeline = [
            {
                // Match titles using case-insensitive regex
                $match: {
                    "title_english": { $regex: novelName, $options: "i" }
                }
            },
            {
                // Add fields to prioritize exact matches and calculate title length
                $addFields: {
                    titleExactMatch: {
                        $cond: {
                            if: {
                                $regexMatch: {
                                    input: "$title_english",
                                    regex: `^${novelName}$`,  // Exact match with regex
                                    options: "i"  // Case-insensitive
                                }
                            },
                            then: 1,  // Exact matches get priority 1
                            else: 0   // Non-exact matches get priority 0
                        }
                    },
                    titleLength: { $strLenCP: "$title_english" } // Get the length of the title
                }
            },
            {
                // Sort by exact match, then by title length (shorter first), then by other criteria (e.g., likes)
                $sort: {
                    titleExactMatch: -1,  // Prioritize exact matches
                    titleLength: 1       // Then prioritize shorter titles
                }
            },
            {
                $limit: 1 // Limit results
            }
        ]

        // Use aggregation to apply prioritization
        const novel = await collection.aggregate(pipeline).toArray();

        res.json(novel);
    } catch (error) {
        console.error('Error fetching novels:', error);
        res.status(500).json({ error: 'Failed to retrieve novels' });
    }
});

// Route to get cover of a novel
novelRouter.get('/api/:novelName/cover', async (req: Request, res: Response) => {
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

// Route to get the chapter list of a novel
novelRouter.get('/api/:novelName/chapterlist', async (req: Request, res: Response) => {
    const { novelName } = req.params;

    // Construct the file path
    const filePath = path.join(novel_path, novelName, "Markdown");

    try {
        // Check if the directory exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Handle directory not found
                return res.status(404).json({ error: 'Chapters not found' });
            }

            // Read the directory asynchronously
            fs.readdir(filePath, (err, files) => {
                if (err) {
                    console.error(`Error reading directory: ${err.message}`);
                    return res.status(500).json({ error: 'Error reading chapter list' });
                }

                // Filter for .md files and remove extensions
                const chapters = files
                    .filter(file => file.endsWith('.md')) // Keep only .md files
                    .map(file => {
                        // Remove the novel title part from the chapter name
                        const chapterName = path.basename(file, '.md');
                        // Extract just the chapter number or relevant part
                        const match = chapterName.match(/Chapter\s+(\d+)/i);
                        return match ? `Chapter ${match[1]}` : chapterName; // Adjust as necessary
                    });

                // Sort chapters numerically
                const sortedChapters = chapters.sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10); // Extract the number from chapter name
                    const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10); // Extract the number from chapter name
                    return numA - numB; // Sort numerically
                });

                // Send the sorted chapter list as a response
                res.json({ chapters: sortedChapters });
            });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: `Failed to retrieve chapter list` });
    }
});

// Route to read a specific chapter of a novel
novelRouter.get('/api/:novelName/:chapterNumber', async (req: Request, res: Response) => {
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

export default novelRouter;