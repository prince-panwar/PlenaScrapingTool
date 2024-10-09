"use client"
import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

export default function ScrapePage() {
  const [coinUrl, setCoinUrl] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [csvContent, setCsvContent] = useState('');

  const scrapeData = async () => {
    try {
      const response = await axios.get(`/api/scrape?url=${encodeURIComponent(coinUrl)}`);
      setMessage(response.data.message || 'Data scraped successfully.');
      setDownloadUrl(response.data.csvFilePath);
      fetchCsvContent();
    } catch (error) {
      setMessage(error.response?.data?.error?.toString() || 'Error scraping data.');
    }
  };

  const fetchCsvContent = async () => {
    try {
      const response = await axios.get(`/api/get-csv`);
      setCsvContent(response.data);
      console.log(response.data);
    } catch (error) {
      console.error('Error fetching CSV content:', error);
    }
  };

  useEffect(() => {
    fetchCsvContent();
  }, []);

  // Function to display CSV content in a formatted way
  const formatCsvContent = (csv) => {
    if (!csv) return null;
    const rows = csv.split('\n').filter(Boolean);
    const headers = rows[0].split(',');

    return (
      <div className="overflow-auto max-h-96 mt-4">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="border px-4 py-2 text-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row, rowIndex) => {
              const columns = row.split(',');

              return (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => {
                    // Ensure the header exists before checking its value
                    const header = headers[colIndex];
                    if (header && header.toLowerCase().includes('telegram admin')) {
                      // If the column contains a comma-separated list of admins, split them
                      const admins = column.split(',').map(admin => admin.trim());
                      return (
                        <td key={colIndex} className="border px-4 py-2 text-black">
                          {admins.map((admin, i) => (
                            <div key={i}>{admin}</div>
                          ))}
                        </td>
                      );
                    }
                    // For other columns, display the data normally
                    return (
                      <td key={colIndex} className="border px-4 py-2 text-black">
                        {column}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Layout>
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md mx-auto mt-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-black">Scrape Coin Data</h1>
        <input
          type="text"
          placeholder="Enter coin URL"
          value={coinUrl}
          onChange={(e) => setCoinUrl(e.target.value)}
          className="w-full mb-4 px-3 py-2 border rounded text-black"
        />
        <button
          onClick={scrapeData}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Scrape
        </button>
        {message && (
          <p className="mt-4 text-center font-semibold text-black">
            {typeof message === 'string' ? message : 'An unexpected error occurred.'}
            {' '}
            {downloadUrl && (
              <a
                href={`/api/download_csv?file=${encodeURIComponent(downloadUrl)}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download CSV
              </a>
            )}
          </p>
        )}
      </div>
      {csvContent && (
        <div className="bg-white p-8 rounded shadow-md w-full max-w-4xl mx-auto mt-6">
          <h2 className="text-xl font-bold mb-2 text-black">CSV Content</h2>
          {formatCsvContent(csvContent)}
        </div>
      )}
    </Layout>
  );
}
