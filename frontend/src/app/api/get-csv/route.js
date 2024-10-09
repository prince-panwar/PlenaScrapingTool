import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(req) {
 

try {
    // Fetch the CSV file from the backend
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download_csv`,);

    // Return the CSV content as a plain text response
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    console.error('Error fetching CSV file:', error);
    return NextResponse.json(
      { error: 'Error fetching CSV file' },
      { status: error.response?.status || 500 }
    );
  }
}
