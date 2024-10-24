import axios from 'axios';

export async function POST(req) {
  try {
    // Send the POST request to the backend logout route
    const response = await axios.post(
      `https://plenascrapingtool.onrender.com/logout`,
      {},
      {
        headers: {
          Cookie: req.headers.get('cookie') || '', // Forward the cookies from the client
        },
      }
    );

    // Return the response, along with any Set-Cookie headers for session management
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: {
        'Set-Cookie': response.headers['set-cookie'] || '',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle any errors and return an appropriate error response
    return new Response(
      JSON.stringify({ error: error.response?.data || 'Error occurred during logout' }),
      { status: error.response?.status || 500 }
    );
  }
}
