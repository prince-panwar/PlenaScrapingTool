import dotenv from 'dotenv';
import { TelegramClient, Api, errors } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

// Initial empty session string (or load from your database if available)
let sessionString = '';
let stringSession = new StringSession(sessionString);

let client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Function to update session string and refresh the client
export async function setSessionString(newSessionString) {
  sessionString = newSessionString;
  stringSession = new StringSession(newSessionString);
  
  // Update client with the new session
  client.session = stringSession;
  
  // Reconnect client if it’s already connected or was previously connected
  if (client.connected) {
    await client.disconnect();
  }
  await client.connect();
}

export { client, Api, errors, sessionString };
