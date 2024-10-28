import { client,setSessionString, Api ,sessionString } from '../clients/telegramClient.js';
import { supabase } from '../clients/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
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
        return false;
      }
       
      //console.log(data[0].sessionKey)
      // Extract the session string from the first item in the data array
      setSessionString(data[0].sessionKey);
       return true;
   
  
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
  
export const startLogin = async (req, res) => {
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
  }

export const submitPassword = async (req, res) => {
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
      setSessionString(session);
  
      res.json({ message: 'Login successful with password.' });
    } catch (error) {
      console.error('Error submitting password:', error);
      res.status(500).json({ error: `Error submitting password: ${error.message}` });
    }
  }


  export const completeLogin = async (req, res) => {
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
        setSessionString(session);
        
        res.json({ message: 'Login successful.' });
      } catch (error) {
        console.error('Error completing login:', error);
        res.status(500).json({ error: `Error completing login: ${error.message}` });
      }
    
  }

  export const logout = async (req, res) => {
    try {
       // Disconnect the client
      await client.connect();
      const result=await client.invoke(new Api.auth.LogOut());
      console.log(result);
      console.log('Logged out successfully');
      
      deleteAllSessionKeys();
  
      
      res.json({ message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ error: 'Error during logout.' });
    }
  }

  export const connectionStatus = async (req, res) => {
    try {
      const isConnected = await getSession();
      res.status(200).json({ isConnected });
    } catch (e) {
      console.error('Error checking connection status:', e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

