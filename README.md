# Crypto Coin Scraping Tool

This project is a web-based tool for scraping cryptocurrency data from CoinMarketCap. It allows users to input a URL for a specific coin's page and automatically scrapes data such as coin name, price, and social media links. The tool also integrates with Telegram, allowing users to log in and potentially fetch additional data such as Telegram group admins.

## Features
- Scrape data from CoinMarketCap coin pages.
- Automatically retrieve coin name, price, and social media links (Twitter, Discord, Telegram).
- Integrated Telegram login for fetching group admin details.

## Prerequisites
Before setting up the project, ensure you have the following:
- **Node.js** and **npm** installed on your system.
- **Telegram API ID and API Hash**, which can be obtained from the [Telegram API website](https://my.telegram.org/auth).
- **A Telegram phone number** to receive a verification code for authentication.

## Setup Instructions

### 1. Get Telegram API Credentials
1. Go to the [Telegram API website](https://my.telegram.org/auth) and log in with your Telegram account.
2. Create a new application by filling out the form with your app name and platform.
3. After creating the application, you will receive an **API ID** and an **API Hash**.

### 2. Configure Environment Variables
1. Create a `.env` file inside the `scrapingbackend` directory.
2. Add the following environment variables to the `.env` file, replacing the placeholders with your actual API ID, API Hash, and Telegram phone number:

    ```env
    TELEGRAM_API_ID=your_api_id
    TELEGRAM_API_HASH=your_api_hash
  
    ```

### 3. Install Dependencies
Navigate to the root directory and run the following command to install all dependencies for both the frontend and backend:

```bash
npm install
```
### 4. Start the Application
To start both the frontend and backend simultaneously, use the command:

```bash
npm run start
```
This will first start the backend, followed by the frontend.

### 5. Log in with Your Telegram Account
When prompted, enter the same Telegram phone number for which you obtained the API credentials.
You will receive a verification code on your Telegram app. Enter this code when prompted.
### 6. Scrape Coin Data
1. Once logged in, navigate to the web interface.
2. Enter the URL of a cryptocurrency coin page from CoinMarketCap (e.g., https://coinmarketcap.com/currencies/bitcoin/).
3. Click the Scrape button to automatically fetch and display the coin's data, including coin name, price, and social media links.
4. If the coin has an associated Telegram group, the tool will also attempt to fetch admin details.
### Project Structure
1. frontend/: Contains the Next.js-based frontend for the scraping tool.
2. backend/: Contains the Express-based backend for handling scraping and Telegram integration.
### Dependencies
1. Node.js: JavaScript runtime environment.
2. Express: Backend framework for the server.
3. Next.js: React framework for the frontend.
4. Telegram API: For integrating Telegram login and data fetching.
5. Cheerio: For web scraping.
### Notes
The tool requires a valid Telegram account to log in and authenticate the scraping operations.
Make sure to respect CoinMarketCap's terms of service when using this tool.
Troubleshooting
If the Telegram login fails, ensure that the phone number and API credentials are correct.
Make sure you are not running the tool too frequently, as this could lead to temporary bans from services like CoinMarketCap or Telegram.
