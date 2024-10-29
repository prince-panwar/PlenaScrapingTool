import express from "express";
import { scrape,getData,downloadData, deleteAllData} from "../controllers/scrape.js";

export const scrapeRoute = express.Router();

scrapeRoute.get('/scrape',scrape );
scrapeRoute.get('/getData', getData);
scrapeRoute.get('/downloadCSV', downloadData);
scrapeRoute.post('/deleteData',deleteAllData);