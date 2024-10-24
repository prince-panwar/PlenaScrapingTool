"use client"
import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
export default function ScrapeDataComponent() {
  const [coinUrl, setCoinUrl] = useState('');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/get-csv');
      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const scrapeData = async () => {
    if (!coinUrl) {
      setMessage('Please enter a URL');
      return;
    }

    try {
      setMessage('Scraping data...');
      const response = await axios.get(`/api/scrape?url=${encodeURIComponent(coinUrl)}`);
      if (response.status==200) {
        setMessage('Data scraped successfully!');
        fetchData(); // Refresh the data display
      } else {
        setMessage(response.data?.error || 'Failed to scrape data');
      }
    } catch (error) {
      console.error('Error scraping data:', error);
      setMessage(error.response?.data?.error || 'Error occurred while scraping');
    }
  };

  const formatTelegramAdmins = (admins) => {
    if (!admins) return 'No admins';
    if (typeof admins === 'string') return admins;
    return Array.isArray(admins) ? (
      <div className="space-y-1">
        {admins.map((admin, index) => (
          <div key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
            {admin}
          </div>
        ))}
      </div>
    ) : 'Invalid admin data';
  };

  const downloadCSV = async () => {
    try {
      // Make GET request to download endpoint
      const response = await axios.get('https://plenascrapingtool.onrender.com/downloadCSV', {
        responseType: 'blob' // Important for file download
      });
  
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'scrape_data.csv');
      
      // Append to html link element page
      document.body.appendChild(link);
      
      // Start download
      link.click();
      
      // Clean up and remove the link
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      // Handle error appropriately in your UI
    }
  };
  

  return (
    <Layout>
    {/* Scraping Form */}
    <div className="bg-white p-8 rounded shadow-md w-full max-w-md mx-auto mt-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-black">
        Scrape Coin Data
      </h1>
      <input
        type="text"
        placeholder="Enter coin URL"
        value={coinUrl}
        onChange={(e) => setCoinUrl(e.target.value)}
        className="w-full mb-4 px-3 py-2 border rounded text-black"
      />
      <button
        onClick={scrapeData}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
      >
        Scrape
      </button>
      {message && (
        <p className="mt-4 text-center font-semibold text-black">{message}</p>
      )}
    </div>
  
    {/* Data Display */}
    <div className="bg-white p-8 rounded shadow-md w-full max-w-6xl mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4 text-black">Scraped Data</h2>
  
      
        <div className="mb-4 text-center">
          <button
            onClick={downloadCSV}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Download
          </button>
        </div>
     
  
      {isLoading ? (
        <div className="text-center py-4">Loading data...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : !data?.length ? (
        <div className="text-center py-4">No data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coin Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Social Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telegram Admins
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.coinName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.coinPrice}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-2">
                      {item.twitterLink !== 'Not Available' && (
                        <a
                          href={item.twitterLink.startsWith('//') ? `https:${item.twitterLink}` : item.twitterLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          Twitter
                        </a>
                      )}
                      {item.discordLink !== 'Not Available' && (
                        <a
                          href={item.discordLink.startsWith('//') ? `https:${item.discordLink}` : item.discordLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          Discord
                        </a>
                      )}
                      {item.telegramLink !== 'Not Available' && (
                        <a
                          href={item.telegramLink.startsWith('//') ? `https:${item.telegramLink}` : item.telegramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          Telegram
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {/* Format Telegram Admins */}
                    {item.telegramAdmins.length > 5
                      ? item.telegramAdmins.slice(0, 5).join(', ') + '...'
                      : item.telegramAdmins.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Layout>
  
  );
}