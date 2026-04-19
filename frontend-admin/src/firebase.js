// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCIgr5Jl1g6WG4KdQM6tlT8Q3jFgnxY808",
    authDomain: "glocybs-prod.firebaseapp.com",
    projectId: "glocybs-prod",
    storageBucket: "glocybs-prod.firebasestorage.app",
    messagingSenderId: "57214116384",
    appId: "1:57214116384:web:6f431b28ad3894c887d245",
    measurementId: "G-0SK7SK7ZRT"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app); // ✅ ONLY THIS