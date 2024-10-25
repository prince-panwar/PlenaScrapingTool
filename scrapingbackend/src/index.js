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
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('json2csv');
const app = express();
const port = process.env.PORT|| 5000;

app.use(cookieParser());
app.use(cors({
  origin: 'https://codespaces-blank-self.vercel.app', // Your frontend URL
  credentials: true // Allow cookies to be sent
}));

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

const supabase_url = process.env.SUPABASE_URL;
const supabase_key = process.env.SUPABASE_KEY;

const supabase = createClient(supabase_url,supabase_key);
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
let sessionString =  '';
let stringSession = new StringSession(sessionString);



async function getSession(req, res) {
  try {
    // Fetch all data from Supabase, ordered by most recent first
    const { data, error } = await supabase
      .from('session')
      .select('sessionKey')
      .limit(1); // Limit to 1 if you only need the most recent session

    if (error) {
      console.error('Error fetching data from Supabase:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch data'
      });
    }

    // Check if data is empty before accessing it
    if (data.length === 0) {
      console.log("No session found");
    }
     
    //console.log(data[0].sessionKey)
    // Extract the session string from the first item in the data array
     sessionString = data[0].sessionKey;

 

  } catch (e) {
    console.log(e);
   
  }
}
async function storeSessionKey(sessionKey, req, res) {
  try {
    // Delete existing session keys
    const { error: deleteError } = await supabase
      .from('session')
      .delete()
      .neq('sessionKey', null); // This deletes all existing session keys

    if (deleteError) {
      console.error('Error deleting existing session keys:', deleteError);
     
    }

    // Insert new session key
    const { error: insertError } = await supabase
      .from('session')
      .insert([{ sessionKey }]);

    if (insertError) {
      console.error('Error inserting new session key:', insertError);
     
    }

   

  } catch (e) {
    console.log(e);
  }
}
async function deleteAllSessionKeys(req, res) {
  try {
    // Delete all session keys
    const { error } = await supabase
      .from('session')
      .delete()
      .neq('sessionKey', null); // This deletes all existing session keys

    if (error) {
      console.error('Error deleting session keys:', error);
      
    }

   

  } catch (e) {
    console.log(e);
  
  }
}




// Initialize the Telegram client
let client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
  
});

// Start the client if session exists
(async () => {
 getSession();
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
      
      storeSessionKey(session);
      
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

    storeSessionKey(session);

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
    
    deleteAllSessionKeys();

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



function cleanCoinData(coinData) {
  const cleaned = { ...coinData };

  // Convert telegramAdmins string to array if it's a string
  if (typeof cleaned.telegramAdmins === 'string' && 
      cleaned.telegramAdmins !== 'Not Available' && 
      !cleaned.telegramAdmins.startsWith('Error') && 
      !cleaned.telegramAdmins.startsWith('Unable') && 
      !cleaned.telegramAdmins.startsWith('This is a private group')) {
    
    cleaned.telegramAdmins = cleaned.telegramAdmins
      .split(',')
      .map(admin => admin.trim())
      .filter(admin => admin !== 'No Username' && admin !== '');
  } else if (cleaned.telegramAdmins === 'Not Available' || 
             cleaned.telegramAdmins.startsWith('Error') || 
             cleaned.telegramAdmins.startsWith('Unable') || 
             cleaned.telegramAdmins.startsWith('This is a private group')) {
    cleaned.telegramAdmins = [];
  }

  return cleaned;
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

    

   const cleanData =  cleanCoinData(coinData);
   

    // Attempt to insert data
    const { data, error } = await supabase
      .from('scrape_data') // Replace with your actual table name
      .insert([cleanData]);

    if (error) {
      console.error('Error uploading to Supabase:', error.message);
      return res.status(500).send('Error uploading data to Supabase');
    }

    // Send the response with a download link
    res.json({
      message: 'Coin data has been appended to CSV.',
     
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
      } else if (link.includes('discord')) {
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
app.get('/getData', async (req, res) => {
  try {
    // Fetch all data from Supabase, ordered by most recent first
    const { data, error } = await supabase
      .from('scrape_data')
      .select(`
        coinName,
        coinPrice,
        twitterLink,
        discordLink,
        telegramLink,
        telegramAdmins
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data from Supabase:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch data'
      });
    }

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error in fetch endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});
app.get('/downloadCSV', async (req, res) => {
  try {
    // Fetch data from Supabase
    const { data, error } = await supabase
      .from('scrape_data')
      .select(`
        coinName,
        coinPrice,
        twitterLink,
        discordLink,
        telegramLink,
        telegramAdmins
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data from Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch data'
      });
    }

    // Define fields for CSV
    const fields = [
      'coinName',
      'coinPrice',
      'twitterLink',
      'discordLink',
      'telegramLink',
      'telegramAdmins'
    ];

    // Create CSV parser
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=scrape_data.csv');

    // Send CSV file
    res.status(200).send(csv);

  } catch (error) {
    console.error('Error in CSV download:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate CSV'
    });
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
