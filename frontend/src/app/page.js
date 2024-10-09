"use client"
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  const startLogin = async () => {
    if (countdown > 0) return; // Prevent resending if countdown is active

    try {
      const response = await axios.post('/api/start-login',{phoneNumber});
      setMessage(response.data.message);
      setPhoneCodeHash(response.data.phoneCodeHash);
      setCodeSent(true);
      setCountdown(60); // Start the countdown at 60 seconds
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error initiating login.';
      setMessage(errorMessage);
    }
  };

  const submitCode = async () => {
    try {
      const response = await axios.post('/api/complete-login', { code, phoneCodeHash ,phoneNumber },{withCredentials:true});
      const message = response.data.message;
  
      // Handle different server responses
      if (message === 'Login successful.') {
        setMessage('Login was successful! Redirecting...');
        router.push('/scrape'); // Redirect on success
      } else if (message === 'Code is incorrect.') {
        setMessage('The code you entered is incorrect. Please try again.');
      } else if (message === 'Code has expired.') {
        setMessage('The code has expired. Please request a new one.');
      } else if (message === 'Session expired.') {
        setMessage('Your session has expired. Please start the login process again.');
      } else {
        setMessage(message || 'An unexpected error occurred.');
      }
    } catch (error) {
      // Handle any errors returned by the server
      const errorMessage = error.response?.data?.error || 'Error completing login.';
      setMessage(errorMessage);
    }
  };
  

  useEffect(() => {
    if (countdown === 0) return; // No active countdown

    const interval = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
    }, 1000);

    // Clear the interval when countdown reaches zero or component unmounts
    return () => clearInterval(interval);
  }, [countdown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-black">Telegram Login</h1>
        {!codeSent ? (
          <>
           <input
              type="text"
              placeholder="Enter the phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full mb-4 mt-4 px-3 py-2 border rounded text-black"
            />
            <button
              onClick={startLogin}
              className="w-full bg-blue-600 text-black py-2 px-4 rounded hover:bg-blue-700"
            >
              Start Login
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter the code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full mb-4 mt-4 px-3 py-2 border rounded text-black"
            />
            <button
              onClick={submitCode}
              className="w-full bg-green-600 text-black py-2 px-4 rounded hover:bg-green-700"
            >
              Submit Code
            </button>
            <button
              onClick={startLogin}
              className={`w-full mt-4 ${countdown > 0 ? 'bg-gray-400' : 'bg-blue-600'} text-white py-2 px-4 rounded`}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Send Again'}
            </button>
          </>
        )}
        {message && (
          <p className="mt-4 text-center text-black font-semibold">
            {typeof message === 'string' ? message : JSON.stringify(message)}
          </p>
        )}
      </div>
    </div>
  );
}
