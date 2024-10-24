import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    // Fetch the data from your backend
    const response = await axios.get('http://localhost:5000/getData', {
      headers: {
        'Accept': 'application/json'
      }
    });

    // Validate the response data
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Invalid data received from server');
    }

    // Return the data as JSON
    return NextResponse.json({
      success: true,
      data: response.data.data
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Add CORS headers if needed
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      }
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return NextResponse.json({
        success: false,
        error: error.response.data?.error || 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, {
        status: error.response.status
      });
    } else if (error.request) {
      // The request was made but no response was received
      return NextResponse.json({
        success: false,
        error: 'No response from server',
        details: process.env.NODE_ENV === 'development' ? 'The request was made but no response was received' : undefined
      }, {
        status: 503
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, {
        status: 500
      });
    }
  }
}

// Optional: Add HEAD method if you need to support HEAD requests
export async function HEAD(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Optional: Add OPTIONS method if you need CORS support
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}