const firebaseConfig = {
  apiKey: "AIzaSyC7PAE-QNkUxv1yGwI7b7iYtw45uWBrVxM",
  authDomain: "salada-logistica-e79bd.firebaseapp.com",
  databaseURL: "https://salada-logistica-e79bd-default-rtdb.firebaseio.com",
  projectId: "salada-logistica-e79bd",
  storageBucket: "salada-logistica-e79bd.firebasestorage.app",
  messagingSenderId: "214284963539",
  appId: "1:214284963539:web:39997191245637545f8e26",
  measurementId: "G-VWD6P90QCE"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
