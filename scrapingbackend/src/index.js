// index.js
require('dotenv').config();
var cors = require('cors')

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { TelegramClient, errors } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const session = require('express-session');
const cookieParser = require('cookie-parser');


const app = express();
const port = 5000;

app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true // Allow cookies to be sent
}));

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;


// Session middleware
app.use(express.json());
app.use(session({
  secret: 'mysecret123', // Use a strong secret
  resave: false, // Do not save the session if it hasn't been modified
  saveUninitialized: false, // Do not save uninitialized sessions
  cookie: {
    secure: false, // Set to true if you are using HTTPS
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    maxAge: 60 * 60 * 1000 // 1 hour expiration time
  }
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use a persistent session
let sessionString = process.env.TELEGRAM_SESSION || '';
let stringSession = new StringSession(sessionString);

// Initialize the Telegram client
let client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
  
});

// Start the client if session exists
(async () => {
  if (sessionString) {
    try {
      await client.connect();
      if (await client.isUserAuthorized()) {
        console.log('Telegram client connected using existing session.');
      } else {
        console.log('Session exists but user is not authorized.');
      }
    } catch (error) {
      console.error('Error connecting Telegram client:', error);
    }
  }
})();

// Endpoint to start login

app.post('/start-login', async (req, res) => {
  try {
    // Ensure the client is connected
    await client.connect();
    const phoneNumber = req.body.phoneNumber;
    // Check if the client is already authorized
    if (await client.checkAuthorization()) {
      console.log('Client is already authorized.');
      return res.json({ message: 'You are already logged in.' });
    }

    console.log('Starting login process for phone number:', phoneNumber);

   const result = await client.sendCode({apiId:apiId,apiHash:apiHash},phoneNumber);
   
  req.session.phoneCodeHash = result.phoneCodeHash;

   res.json({ message: 'Code sent to phone number.', phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    // Handle data center migration error
    if (error.message.includes('Phone migrated')) {
      console.log('Phone number migrated to a new data center. Reconnecting...');
      await client.disconnect();
      await client.connect();
      return res.status(200).json({ message: 'Reconnected to new data center. Try again.' });
    }

    console.error('Error initiating login:', error);
    res.status(500).json({ error: `Error initiating login: ${error.message}` });
  }
});

// Endpoint to complete login
app.post('/complete-login', async (req, res) => {
  const code = req.body.code;  // The code entered by the user
 
  const phoneCodeHash = req.body.phoneCodeHash;
  const phoneNumber = req.body.phoneNumber;
  // Retrieve the phoneCodeHash from Redis using the phone number as the key
    console.log('Code:', code);
    console.log('PhoneCodeHash', phoneCodeHash);
    console.log('phonenumber', phoneNumber);
   
    if (!code|| !phoneCodeHash) {
      return res.status(400).json({ error: 'Code is required, or session expired.' });
    }
    await client.connect();
    

    

    try {
      // Use the retrieved phoneCodeHash from Redis to sign in
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code
        })
      );

      // Save the session string
      const session = client.session.save();

      // Store the session string securely in .env file
      let envConfig = fs.readFileSync('.env', 'utf8');
      envConfig = envConfig.replace(/TELEGRAM_SESSION=.*/g, `TELEGRAM_SESSION=${session}`);
      fs.writeFileSync('.env', envConfig);

      // Update the session variables
      sessionString = session;
      stringSession = new StringSession(sessionString);
      client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

     
     

      res.json({ message: 'Login successful.' });
    } catch (error) {
      console.error('Error completing login:', error);
      res.status(500).json({ error: `Error completing login: ${error.message}` });
    }
  
});


// Endpoint to submit password (if two-factor authentication is enabled)
app.post('/submit-password', async (req, res) => {
  const password = req.body.password;

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    await client.signIn({
      password: password,
    });

    // Save the session string
    const session = client.session.save();

    // Store the session string securely
    let envConfig = fs.readFileSync('.env', 'utf8');
    envConfig = envConfig.replace(/TELEGRAM_SESSION=.*/g, `TELEGRAM_SESSION=${session}`);
    fs.writeFileSync('.env', envConfig);

    // Update the session variables
    sessionString = session;
    stringSession = new StringSession(sessionString);
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    req.session.isLoggedIn = true;

    res.json({ message: 'Login successful with password.' });
  } catch (error) {
    console.error('Error submitting password:', error);
    res.status(500).json({ error: `Error submitting password: ${error.message}` });
  }
});

// Logout endpoint
app.post('/logout', async (req, res) => {
  try {
    

   

    // Disconnect the client
    await client.connect();
    const result=await client.invoke(new Api.auth.LogOut());
    console.log(result);
    console.log('Logged out successfully');
    
    // Clear the session data
    clearSessionData();

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Error during logout.' });
  }
});

function clearSessionData() {
  // Clear the session string in the .env file
  let envConfig = fs.readFileSync('.env', 'utf8');
  envConfig = envConfig.replace(/TELEGRAM_SESSION=.*/g, 'TELEGRAM_SESSION=');
  fs.writeFileSync('.env', envConfig);

  // Also clear the session variable in process.env and other variables
  process.env.TELEGRAM_SESSION = '';
  sessionString = '';
  stringSession = new StringSession(sessionString);
}



// Scrape endpoint
app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    // Ensure the client is connected
    if (!client.connected) {
      await client.connect();
    }

    const coinData = await scrapeCoinData(url);

    // Log coinData to verify its structure
    console.log('Scraped Coin Data:', coinData);

    // Define CSV file path
    const csvFilePath = 'coin_data.csv'; // Use a fixed file name

    // Check if the CSV file exists
    const fileExists = fs.existsSync(csvFilePath);

    // Set up the CSV writer
    const csvWriter = createCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'coinName', title: 'Coin Name' },
        { id: 'coinPrice', title: 'Coin Price' },
        { id: 'twitterLink', title: 'Twitter' },
        { id: 'discordLink', title: 'Discord' },
        { id: 'telegramLink', title: 'Telegram' },
        { id: 'telegramAdmins', title: 'Telegram Admins' },
      ],
      append: fileExists, // Append if file exists
    });

    // Write data to the CSV file
    await csvWriter.writeRecords([coinData]);

    // Send the response with a download link
    res.json({
      message: 'Coin data has been appended to CSV.',
      download_url: `/download_csv?file=${encodeURIComponent(csvFilePath)}`,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`An error occurred: ${error.message}`);
  }
});

async function scrapeCoinData(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Initialize variables
    let coinName = 'Not Available';
    let coinPrice = 'Not Available';
    let twitterLink = 'Not Available';
    let discordLink = 'Not Available';
    let telegramLink = 'Not Available';
    let telegramAdmins = 'Not Available';

    // Scrape Coin Name
    const coinNameElement = $('span[data-role="coin-name"]');
    if (coinNameElement.length > 0) {
      coinName = coinNameElement.first().text().trim();
    }

    // Scrape Coin Price
    const coinPriceElement = $('span[data-test="text-cdp-price-display"]');
    if (coinPriceElement.length > 0) {
      coinPrice = coinPriceElement.first().text().trim();
    }

    // Scrape Social Media Links
    $('a[rel="nofollow noopener noreferrer"]').each((index, element) => {
      const link = $(element).attr('href');
      if (link.includes('twitter.com')) {
        twitterLink = link;
      } else if (link.includes('discord.com')) {
        discordLink = link;
      } else if (link.includes('t.me') || link.includes('telegram.me')) {
        telegramLink = link;
      }
    });

    // If Telegram link is available, fetch admins
    if (telegramLink !== 'Not Available') {
      try {
        // Normalize the Telegram link
        let normalizedLink = telegramLink;
        if (telegramLink.startsWith('//')) {
          normalizedLink = 'https:' + telegramLink;
        } else if (!telegramLink.startsWith('http')) {
          normalizedLink = 'https://' + telegramLink;
        }

        // Parse the URL to extract the group username
        const urlObj = new URL(normalizedLink);
        let groupUsername = urlObj.pathname.replace('/', '').replace('@', '').split('/')[0];

        // Log the groupUsername for debugging
        console.log('Group Username:', groupUsername);

        // Fetch the group entity
        const result = await client.invoke(
          new Api.contacts.ResolveUsername({
            username: groupUsername,
          })
        );

        const chat = result.chats[0];

        // Get the list of admins
        const admins = await client.getParticipants(chat, {
          filter: new Api.ChannelParticipantsAdmins(),
        });

        const adminUsernames = admins.map((admin) => admin.username || 'No Username');

        // Combine admin usernames into a comma-separated string
        telegramAdmins = adminUsernames.join(', ');
      } catch (error) {
        console.error('Error fetching Telegram admins:', error.message);

        // Handle specific errors
        if (error.message.includes('USER_PRIVACY_RESTRICTED')) {
          telegramAdmins = 'Unable to fetch admins due to privacy settings.';
        } else if (error.message.includes('CHANNEL_PRIVATE')) {
          telegramAdmins = 'This is a private group; cannot fetch admins.';
        } else if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
          telegramAdmins = 'Invalid Telegram client authentication.';
        } else if (error.message.includes('USERNAME_NOT_OCCUPIED')) {
          telegramAdmins = 'The Telegram group does not exist.';
        } else {
          telegramAdmins = `Error fetching admins: ${error.message}`;
        }
      }
    }

    return {
      coinName,
      coinPrice,
      twitterLink,
      discordLink,
      telegramLink,
      telegramAdmins,
    };
  } catch (error) {
    console.error('Error scraping data:', error.message);
    throw error;
  }
}


// Endpoint to download the CSV file
app.get('/download_csv', (req, res) => {
  
 
  const filePath = 'coin_data.csv'; 

  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Error occurred while downloading the file');
      }
    });
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
