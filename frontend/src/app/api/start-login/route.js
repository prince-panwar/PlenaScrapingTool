import axios from 'axios';

// Named export for POST method
export async function POST(req) {
  try {
    const body = await req.json();

    // Extract the code, phoneCodeHash, and phoneNumber from the body
    const { phoneNumber } = body;
    // Make a request to the backend service
    const response = await axios.post(
      `http://localhost:5000/start-login`,{phoneNumber} // Backend URL
     
    );

    // Return a successful response
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Handle any errors and return a response
    const errorMessage = error.response?.data?.error || 'Error initiating login.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: error.response?.status || 500 }
    );
  }
}
