// components/Layout.js
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Layout({ children }) {
  const router = useRouter();

  const logout = async () => {
    try {
      await axios.post('/api/logout');
      router.push('/');
    } catch (error) {
      console.error('Error logging out.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
      <div className="absolute top-4 right-4">
        <button
          onClick={logout}
          className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
