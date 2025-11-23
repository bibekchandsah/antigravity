const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
// Try to require multer from the project's node_modules, fallback to root if available
const multer = require('multer');

const { verifySession } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GitHub API configuration
// Load environment variables from the upload project's .env file if not already set
if (!process.env.GITHUB_TOKEN) {
    const uploadEnvPath = path.join(__dirname, '../projects/upload/.env');
    if (fs.existsSync(uploadEnvPath)) {
        require('dotenv').config({ path: uploadEnvPath });
        console.log('Loaded GitHub credentials from projects/upload/.env');
    } else {
        console.warn('Warning: projects/upload/.env not found and GITHUB_TOKEN not set.');
    }
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Helper: Upload to GitHub
async function uploadToGitHub(fileName, fileContent, folderPath, overwrite = false, existingSha = null) {
    if (!GITHUB_TOKEN || !GITHUB_USERNAME || !GITHUB_REPO) {
        throw new Error('Missing GitHub configuration');
    }

    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folderPath}/${fileName}`;

    try {
        let requestBody = {
            message: overwrite ? `Update ${fileName}` : `Upload ${fileName}`,
            content: fileContent,
            branch: GITHUB_BRANCH
        };

        // If we have an existing SHA, always include it (file exists)
        if (existingSha) {
            requestBody.sha = existingSha;
            requestBody.message = `Update ${fileName}`;
        } else if (overwrite) {
            // If overwrite is requested but no SHA provided, try to get it
            try {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (getResponse.ok) {
                    const existingFile = await getResponse.json();
                    requestBody.sha = existingFile.sha;
                    requestBody.message = `Update ${fileName}`;
                }
            } catch (error) {
                console.log('File does not exist, creating new file');
            }
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);

            // If we get a 422 error about missing SHA, try to get the SHA and retry
            if (response.status === 422 && errorData.message && errorData.message.includes('sha')) {
                console.log('Retrying with SHA...');
                try {
                    const getResponse = await fetch(url, {
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (getResponse.ok) {
                        const existingFile = await getResponse.json();
                        requestBody.sha = existingFile.sha;
                        requestBody.message = `Update ${fileName}`;

                        const retryResponse = await fetch(url, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody)
                        });

                        if (retryResponse.ok) {
                            return await retryResponse.json();
                        }
                    }
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
            }

            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload to GitHub: ${error.message}`);
    }
}

// Helper: Fetch folders from GitHub
async function getFoldersFromGitHub() {
    if (!GITHUB_TOKEN || !GITHUB_USERNAME || !GITHUB_REPO) return [];

    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const contents = await response.json();

        // Filter only directories
        const folders = contents
            .filter(item => item.type === 'dir')
            .map(folder => folder.name)
            .sort();

        return folders;
    } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
    }
}

// Apply verifySession to all routes
router.use(verifySession);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        github: {
            username: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            branch: GITHUB_BRANCH
        }
    });
});

// Get repository statistics
router.get('/api/repo-stats', async (req, res) => {
    try {
        if (!GITHUB_TOKEN) return res.status(500).json({ error: 'GitHub Token missing' });

        // Get repository information
        const repoUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`;
        const repoResponse = await fetch(repoUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!repoResponse.ok) {
            throw new Error(`GitHub API error: ${repoResponse.status}`);
        }

        const repoData = await repoResponse.json();

        // Get repository contents to calculate detailed usage
        const contentsUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;
        const contentsResponse = await fetch(contentsUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let folderStats = {};
        let totalFiles = 0;

        if (contentsResponse.ok) {
            const contents = await contentsResponse.json();

            // Get stats for each folder
            for (const item of contents) {
                if (item.type === 'dir') {
                    try {
                        const folderUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${item.name}`;
                        const folderResponse = await fetch(folderUrl, {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });

                        if (folderResponse.ok) {
                            const folderContents = await folderResponse.json();
                            const fileCount = folderContents.filter(file => file.type === 'file').length;
                            const folderSize = folderContents
                                .filter(file => file.type === 'file')
                                .reduce((sum, file) => sum + (file.size || 0), 0);

                            folderStats[item.name] = {
                                fileCount: fileCount,
                                size: folderSize,
                                lastModified: item.sha
                            };
                            totalFiles += fileCount;
                        }
                    } catch (error) {
                        console.error(`Error fetching folder ${item.name}:`, error);
                    }
                } else if (item.type === 'file') {
                    totalFiles++;
                }
            }
        }

        // GitHub free tier limits (approximate)
        const FREE_TIER_LIMIT = 1024 * 1024 * 1024; // 1GB
        const WARNING_THRESHOLD = FREE_TIER_LIMIT * 0.8; // 80%
        const CRITICAL_THRESHOLD = FREE_TIER_LIMIT * 0.95; // 95%

        const stats = {
            repository: {
                name: repoData.name,
                fullName: repoData.full_name,
                size: repoData.size * 1024, // GitHub returns size in KB
                private: repoData.private,
                createdAt: repoData.created_at,
                updatedAt: repoData.updated_at,
                defaultBranch: repoData.default_branch
            },
            usage: {
                totalSize: repoData.size * 1024,
                totalFiles: totalFiles,
                folders: folderStats,
                limits: {
                    freeLimit: FREE_TIER_LIMIT,
                    warningThreshold: WARNING_THRESHOLD,
                    criticalThreshold: CRITICAL_THRESHOLD
                }
            },
            calculated: {
                usagePercentage: ((repoData.size * 1024) / FREE_TIER_LIMIT) * 100,
                remainingSpace: FREE_TIER_LIMIT - (repoData.size * 1024),
                status: repoData.size * 1024 > CRITICAL_THRESHOLD ? 'critical' :
                    repoData.size * 1024 > WARNING_THRESHOLD ? 'warning' : 'good'
            }
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching repository stats:', error);
        res.status(500).json({
            error: 'Failed to fetch repository statistics',
            message: error.message
        });
    }
});

// Get files from a specific folder
router.get('/api/folder/:folderName', async (req, res) => {
    try {
        const folderName = req.params.folderName;
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folderName}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const files = await response.json();

        // Filter only files (not subdirectories) and add additional info
        const fileList = files
            .filter(item => item.type === 'file')
            .map(file => ({
                name: file.name,
                size: file.size,
                downloadUrl: file.download_url,
                htmlUrl: file.html_url,
                sha: file.sha,
                path: file.path,
                lastModified: file.sha, // We'll use SHA as a change indicator
                isImage: /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name),
                isVideo: /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(file.name),
                isPdf: /\.pdf$/i.test(file.name),
                fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            folder: folderName,
            files: fileList,
            totalFiles: fileList.length,
            totalSize: fileList.reduce((sum, file) => sum + file.size, 0)
        });
    } catch (error) {
        console.error('Error fetching folder contents:', error);
        res.status(500).json({
            error: 'Failed to fetch folder contents',
            message: error.message
        });
    }
});

// Proxy file download to avoid CORS issues
router.get('/api/download/:folderName/:fileName', async (req, res) => {
    try {
        // Decode URL parameters to handle spaces and special characters
        const folderName = decodeURIComponent(req.params.folderName);
        const fileName = decodeURIComponent(req.params.fileName);

        console.log(`Download request: ${folderName}/${fileName}`);

        // First get the file info from GitHub API to get the download URL
        const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;

        const apiResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!apiResponse.ok) {
            console.error(`GitHub API error for file ${folderName}/${fileName}: ${apiResponse.status}`);
            throw new Error(`File not found in repository: ${apiResponse.status}`);
        }

        const fileInfo = await apiResponse.json();

        // Use the download_url from the API response
        const downloadUrl = fileInfo.download_url;

        if (!downloadUrl) {
            throw new Error('Download URL not available');
        }

        // Fetch the actual file content
        const fileResponse = await fetch(downloadUrl);

        if (!fileResponse.ok) {
            throw new Error(`Failed to download file: ${fileResponse.status}`);
        }

        // Set appropriate headers
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // For images, don't set attachment header so they display inline
        if (!contentType.startsWith('image/')) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Get the file content as buffer and send it
        const buffer = await fileResponse.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(404).json({
            error: 'File not found',
            message: error.message
        });
    }
});

// Delete a file from repository
router.delete('/api/file/:folderName/:fileName', async (req, res) => {
    try {
        const { folderName, fileName } = req.params;
        const { sha } = req.body;

        if (!sha) {
            return res.status(400).json({ error: 'File SHA is required for deletion' });
        }

        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folderName}/${fileName}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Delete ${fileName}`,
                sha: sha,
                branch: GITHUB_BRANCH
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        res.json({
            success: true,
            message: `File ${fileName} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            error: 'Failed to delete file',
            message: error.message
        });
    }
});

// API endpoint to get available folders
router.get('/api/folders', async (req, res) => {
    try {
        const folders = await getFoldersFromGitHub();
        res.json({ folders });
    } catch (error) {
        console.error('Error getting folders:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// Check if file exists in repository
router.post('/api/check-file', async (req, res) => {
    try {
        const { fileName, folder } = req.body;
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folder}/${fileName}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const fileData = await response.json();
            res.json({
                exists: true,
                sha: fileData.sha,
                url: fileData.html_url
            });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking file:', error);
        res.json({ exists: false });
    }
});

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received');

        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { folder, customFolder, fileName, overwrite, existingSha } = req.body;
        const finalFileName = fileName || req.file.originalname;
        const folderPath = customFolder || folder || 'uploads';

        console.log(`Uploading file: ${finalFileName} to folder: ${folderPath}, overwrite: ${overwrite}`);

        // Convert file buffer to base64
        const fileContent = req.file.buffer.toString('base64');

        // Upload to GitHub
        const result = await uploadToGitHub(finalFileName, fileContent, folderPath, overwrite === 'true', existingSha);

        console.log('Upload successful:', finalFileName);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: result.content.html_url,
            downloadUrl: result.content.download_url
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

// Upload base64 image (for cropped images)
router.post('/upload-base64', async (req, res) => {
    try {
        console.log('Base64 upload request received');

        const { imageData, fileName, folder, customFolder, overwrite, existingSha } = req.body;

        if (!imageData || !fileName) {
            console.error('Missing image data or filename');
            return res.status(400).json({ error: 'Missing image data or filename' });
        }

        const folderPath = customFolder || folder || 'uploads';

        console.log(`Uploading base64 image: ${fileName} to folder: ${folderPath}, overwrite: ${overwrite}`);

        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

        // Upload to GitHub
        const result = await uploadToGitHub(fileName, base64Data, folderPath, overwrite, existingSha);

        console.log('Base64 upload successful:', fileName);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            url: result.content.html_url,
            downloadUrl: result.content.download_url
        });

    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

module.exports = router;
