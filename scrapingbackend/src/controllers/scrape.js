import dotenv from 'dotenv';
import axios from 'axios';
import { createRequire } from 'module';
import { Parser } from 'json2csv';
import { supabase } from '../clients/supabaseClient.js';
import { client, Api } from '../clients/telegramClient.js';
dotenv.config();

const require = createRequire(import.meta.url);
const cheerio = require('cheerio');


export const scrape =async (req, res) => {
    const url = req.query.url;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }
  
    try {
    
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
  }
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
      let coinMarketCapLink = url;
  
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
        coinMarketCapLink,
      };
    } catch (error) {
      console.error('Error scraping data:', error.message);
      throw error;
    }
  }


export const getData=  async (req, res) => {
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
          telegramAdmins,
          coinMarketCapLink
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
  }

  export const deleteAllData = async (req, res) => {
    try {
      // Delete all rows from scrape_data table in Supabase
      const { error } = await supabase
        .from('scrape_data')
        .delete()
        .neq('id', 0); // A workaround to target all rows
  
      if (error) {
        console.error('Error deleting data from Supabase:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete data',
        });
      }
  
      return res.status(200).json({
        success: true,
        message: 'All data deleted successfully',
      });
    } catch (error) {
      console.error('Error in delete endpoint:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
  

 export const downloadData= async (req, res) => {
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
          telegramAdmins,
          coinMarketCapLink
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
        'telegramAdmins',
        'coinMarketCapLink',
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
  }


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
  