//app.ts
import * as fs from "node:fs";
import path from 'path';
import express, {Request, Response} from 'express'; // Import Request and Response types
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 3000;

const novel_path = path.join(process.cwd(), 'Test_Novels')

// Use CORS middleware
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend URL
}));

// Route to list folders in a specific directory
app.get('/api/novels', async (req: Request, res: Response) => {
    try {
        // Read the contents of the 'Test_Novels' directory
        fs.readdir(novel_path, {withFileTypes: true}, (err, files) => {
            if (err) {
                console.error(`Error reading directory: ${err.message}`);
                return res.status(500).json({error: 'Error reading directory'});
            }

            // Filter for directories only
            const folders = files
                .filter(file => file.isDirectory()) // Only keep directories
                .map(file => file.name); // Get the name of the directory

            // Respond with the list of folder names
            res.json(folders);
        });
    } catch (error) {
        console.error('Error listing folders:', error);
        res.status(500).json({error: 'Failed to retrieve folders'});
    }
});

app.get('/api/:novelName/cover', async (req: Request, res: Response) => {
    const { novelName } = req.params;
    const filePath: string = path.join(novel_path, novelName, `Cover.png`); // Update file extension if necessary

    try {
        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Set the Content-Type header and send the image
            res.setHeader('Content-Type', 'image/png'); // Adjust for the correct image type
            res.sendFile(filePath);
        } else {
            // Handle case when file is not found
            res.status(404).json({ error: `Cover image for ${novelName} not found` });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        // Send a 500 error for unexpected issues
        res.status(500).json({ error: 'Failed to send cover' });
    }
});

// Route to read a specific chapter of a novel
app.get('/api/:novelName/:chapterNumber', async (req: Request, res: Response) => {
    const {novelName, chapterNumber} = req.params;

    // Construct the file path
    const filePath = path.join(novel_path, novelName, novelName + ` Chapter ${chapterNumber}.md`); // Adjust the file extension as necessary

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// module.exports = app(); // Not needed if using ES modules
