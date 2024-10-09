import axios from 'axios';

export async function POST(req) {
  try {
    // Read the body of the request
    const body = await req.json();

    // Extract the code, phoneCodeHash, and phoneNumber from the body
    const { code, phoneCodeHash, phoneNumber } = body;

    // Send POST request to your backend, passing the code, phoneCodeHash, and phoneNumber
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/complete-login`,
      { code, phoneCodeHash, phoneNumber },  // Pass code, phoneCodeHash, and phoneNumber in the body
      {
        headers: {
          Cookie: req.headers.get('cookie') || '',  // Forward cookies if needed
        },
        withCredentials: true,  // Include credentials in the request
      }
    );

    // Return the response from the backend, along with any cookies
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: {
        'Set-Cookie': response.headers['set-cookie'] || '',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle errors and send appropriate error messages
    const errorMessage = error.response?.data?.error || 'An error occurred while completing the login.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: error.response?.status || 500 }
    );
  }
}
