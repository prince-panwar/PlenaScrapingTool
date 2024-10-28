import express from "express";
import { scrape,getData,downloadData} from "../controllers/scrape.js";

export const scrapeRoute = express.Router();

scrapeRoute.get('/scrape',scrape );
scrapeRoute.get('/getData', getData);
scrapeRoute.get('/downloadCSV', downloadData);