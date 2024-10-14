import axios from 'axios';

export async function GET(req) {
  try {
    // Convert searchParams to a plain object
    const queryParams = Object.fromEntries(req.nextUrl.searchParams);

    // Send the GET request to your backend API, passing query parameters and cookies
    const response = await axios.get(
      `http://localhost:5000/scrape`,
      {
        params: queryParams, // Pass query parameters as an object
        headers: {
          Cookie: req.headers.get('cookie') || '', // Forward the cookies from the client
        },
        withCredentials: true // Allow credentials (cookies) to be sent
      }
    );

    // Return the response data and cookies
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: {
        'Set-Cookie': response.headers['set-cookie'] || '',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle errors and send appropriate error response
    return new Response(
      JSON.stringify({ error: error.response?.data || 'Error occurred during scraping' }),
      { status: error.response?.status || 500 }
    );
  }
}
