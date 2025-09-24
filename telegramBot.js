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

// Placeholder for fetching logs from Telegram (to be implemented later)
const fetchLogsFromTelegram = async (lastFetchedUpdateId = 0) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
        console.error('Telegram bot token or chat ID is not properly configured. Cannot fetch logs.');
        return [];
    }

    try {
        const response = await telegramApi.get('/getUpdates', {
            params: {
                offset: lastFetchedUpdateId + 1,
                timeout: 10, // Long polling timeout
            }
        });
        
        const updates = response.data.result;
        // Process updates to extract log entries if any. This is highly dependent on how you send logs from other devices.
        // For now, this is a placeholder.
        console.log(`Fetched ${updates.length} updates from Telegram.`);
        return updates; // Return raw updates for now
    } catch (error) {
        console.error('Error fetching logs from Telegram:', error.response?.data || error.message);
        return [];
    }
};

module.exports = {
    sendLogToTelegram,
    fetchLogsFromTelegram,
};
