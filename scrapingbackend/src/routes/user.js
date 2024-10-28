import express from "express";
import { connectionStatus, startLogin, completeLogin, logout, submitPassword } from "../controllers/user.js";

export const userRoute = express.Router();

userRoute.get('/Connection-status', connectionStatus);
userRoute.post('/start-login', startLogin);
userRoute.post('/complete-login', completeLogin);
userRoute.post('/submit-password', submitPassword);
userRoute.post('/logout', logout);


