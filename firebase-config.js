// =============================================
// Firebase 設定ファイル - 統合版
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyCg_kbwJVJr4KalZgJag9w4BivRE1BQArc",
  authDomain: "sbs-nagoya.firebaseapp.com",
  projectId: "sbs-nagoya",
  storageBucket: "sbs-nagoya.firebasestorage.app",
  messagingSenderId: "900032955857",
  appId: "1:900032955857:web:6ddabbd9f4c12992724cf0",
  measurementId: "G-GFG99PTCGK"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
