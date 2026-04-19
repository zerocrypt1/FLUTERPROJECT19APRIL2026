// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
 
// aakrit personal
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChuCaW-TQfGN1eeISyvPdE4flXnMCI9-A",
  authDomain: "ramyankotpapp.firebaseapp.com",
  projectId: "ramyankotpapp",
  storageBucket: "ramyankotpapp.firebasestorage.app",
  messagingSenderId: "753836211204",
  appId: "1:753836211204:web:1cdb364c1e0affce7ec951",
  measurementId: "G-6V9S6FLNLD"
};

 
// glocybs1
// const firebaseConfig = {
//   apiKey: "AIzaSyACkTCrxz0kQSzUyyJXETM_ctTZwJ4Xukw",
//   authDomain: "ramyank-otp-verification.firebaseapp.com",
//   projectId: "ramyank-otp-verification",
//   storageBucket: "ramyank-otp-verification.firebasestorage.app",
//   messagingSenderId: "367229390069",
//   appId: "1:367229390069:web:de94e018467df3e579c9bc",
//   measurementId: "G-G0G8YYS9HP"
// };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
// auth.settings.appVerificationDisabledForTesting = true;