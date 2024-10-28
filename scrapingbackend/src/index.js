// index.js
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { userRoute } from './routes/user.js'; 
import { scrapeRoute } from './routes/scrape.js';

dotenv.config();
const app = express();
const port = process.env.PORT|| 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true 
}));

// Session middleware
app.use(express.json());
//user enpoint
app.use('/',userRoute);
// Scrape endpoint
app.use('/', scrapeRoute);


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
