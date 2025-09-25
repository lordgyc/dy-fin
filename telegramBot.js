const axios = require('axios');
const FormData = require('form-data'); // Import form-data

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8242636316:AAG0OHvrVVJPJycgDXOTGHu7ZG8y_EZ4UrY'; // Use environment variable or replace
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '956063463';   // Use environment variable or replace

if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || !TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
    console.warn('WARNING: Telegram bot token or chat ID not configured. Sync functionality will not work.');
}

const telegramApi = axios.create({
    baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`,
    headers: { 'Content-Type': 'application/json' },
});

// Helper function to escape MarkdownV2 special characters
const escapeMarkdownV2 = (text) => {
    if (!text) return '';
    // Aggressively escape all special MarkdownV2 characters that are not part of an explicit syntax.
    // The order of characters in the character class matters to avoid range errors. Hyphen is at the end.
    return text.replace(/([_\*[\]()~`>#+=|{}.!-])/g, '\\$1');
};

const sendLogToTelegram = async (logEntries) => { // Now accepts an array of log entries
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
        console.error('Telegram bot token or chat ID is not properly configured. Cannot send log.');
        return false;
    }

    if (!Array.isArray(logEntries) || logEntries.length === 0) {
        console.log('No log entries to send to Telegram.');
        return true; // Consider it successful if there's nothing to send
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Use for unique filename
    const logFileName = `activity_logs_batch_${timestamp}.json`;
    const logFileContent = JSON.stringify(logEntries, null, 2); // Stringify the array of logs

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', Buffer.from(logFileContent, 'utf8'), { filename: logFileName, contentType: 'application/json' });
    
    // Update caption to indicate a batch of logs
    const captionText = 
`\*Activity Log Batch\*
Number of logs: ${logEntries.length}
Timestamp: ${escapeMarkdownV2(timestamp)}`;

    formData.append('caption', captionText, { contentType: 'text/markdown;charset=utf-8' });
    formData.append('parse_mode', 'MarkdownV2');

    try {
        await telegramApi.post('/sendDocument', formData, {
            headers: formData.getHeaders(),
        });
        console.log(`Sent ${logEntries.length} log entries as a file to Telegram successfully.`);
        return true;
    } catch (error) {
        console.error('Error sending log file to Telegram:', error.response?.data || error.message);
        return false;
    }
};

// Function to fetch logs from Telegram
const fetchLogsFromTelegram = async (lastFetchedUpdateId = 0) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
        console.error('Telegram bot token or chat ID is not properly configured. Cannot fetch logs.');
        return { logs: [], newLastUpdateId: lastFetchedUpdateId };
    }

    let allFetchedLogs = [];
    let newLastUpdateId = lastFetchedUpdateId;

    try {
        const response = await telegramApi.get('/getUpdates', {
            params: {
                offset: lastFetchedUpdateId > 0 ? lastFetchedUpdateId + 1 : 0, // Start from the next update
                timeout: 30, // Long polling timeout for better real-time updates
                allowed_updates: ['message'], // Only interested in messages
            }
        });
        
        const updates = response.data.result;
        console.log(`Fetched ${updates.length} updates from Telegram.`);
        console.log('Raw Telegram updates:', JSON.stringify(updates, null, 2)); // Detailed log of updates

        for (const update of updates) {
            newLastUpdateId = Math.max(newLastUpdateId, update.update_id);

            if (update.message && update.message.document) {
                // Check if it's a JSON file from our system (heuristic: filename or caption)
                const document = update.message.document;
                console.log('Detected document in update:', JSON.stringify(document, null, 2)); // Log document details
                if (document.file_name && document.file_name.startsWith('activity_logs_batch_') && document.file_name.endsWith('.json')) {
                    console.log(`Found a potential log batch file: ${document.file_name}`);

                    // Get file path from Telegram
                    const fileInfoResponse = await telegramApi.get(`/getFile?file_id=${document.file_id}`);
                    const filePath = fileInfoResponse.data.result.file_path;
                    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

                    // Download the file content
                    const fileContentResponse = await axios.get(fileUrl, { responseType: 'text' });
                    const logData = fileContentResponse.data;

                    try {
                        const parsedLogs = JSON.parse(logData);
                        if (Array.isArray(parsedLogs)) {
                            allFetchedLogs = allFetchedLogs.concat(parsedLogs);
                            console.log(`Successfully parsed ${parsedLogs.length} logs from ${document.file_name}`);
                        } else {
                            console.warn(`Downloaded file ${document.file_name} is not an array of logs.`);
                        }
                    } catch (parseError) {
                        console.error(`Error parsing JSON from ${document.file_name}:`, parseError.message);
                    }
                } else {
                    console.warn(`Document file name did not match expected pattern: ${document.file_name}`);
                }
            } else if (update.message) {
                console.log('Received non-document message, type:', update.message.text ? 'text' : 'other'); // Log non-document messages
            }
        }
        console.log(`Final allFetchedLogs before return: ${allFetchedLogs.length} logs.`, JSON.stringify(allFetchedLogs, null, 2)); // Final log
        return { logs: allFetchedLogs, newLastUpdateId };
    } catch (error) {
        console.error('Error fetching logs from Telegram:', error.response?.data || error.message);
        return { logs: [], newLastUpdateId: lastFetchedUpdateId };
    }
};

module.exports = {
    sendLogToTelegram,
    fetchLogsFromTelegram,
};
