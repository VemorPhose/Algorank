// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBPTA9SYP_A5ZVYeXQh0TarEmvpYTG3baI",
  authDomain: "algorank-ff22c.firebaseapp.com",
  projectId: "algorank-ff22c",
  storageBucket: "algorank-ff22c.firebasestorage.app",
  messagingSenderId: "501153358100",
  appId: "1:501153358100:web:5e1050a3e3596d9cfca201",
  measurementId: "G-CNW3FBL8EG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
export const auth = getAuth(app);