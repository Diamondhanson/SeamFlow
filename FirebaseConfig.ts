// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Optionally import the services that you want to use
// import {...} from 'firebase/auth';
// import {...} from 'firebase/database';
// import {...} from 'firebase/firestore';
// import {...} from 'firebase/functions';
// import {...} from 'firebase/storage';

// Initialize Firebase
// const firebaseConfig = {
//   apiKey: 'AIzaSyBG8z5KxPcH_Cb-y7u2eP6rWAssqCkkNoU',
//   authDomain: 'seamflow-ea00b.firebaseapp.com',
//   databaseURL: 'https://seamflow-ea00b.firebaseio.com',
//   projectId: 'seamflow-ea00b',
//   storageBucket: 'seamflow-ea00b.appspot.com',
//   messagingSenderId: '879451838140',
//   appId: '1:879451838140:android:86ad16df974283a93862b9',
//   measurementId: 'G-measurement-id',
// };

// const app = initializeApp(firebaseConfig);
// // For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDrPD3gFF3TnvtwlIYKw54zKdBs-h8rntU",
  authDomain: "seamflow-ea00b.firebaseapp.com",
  projectId: "seamflow-ea00b",
  storageBucket: "seamflow-ea00b.firebasestorage.app",
  messagingSenderId: "879451838140",
  appId: "1:879451838140:web:c35670fa728a76a33862b9",
  measurementId: "G-ZTJ73WVQWC"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
// const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, provider, db };
