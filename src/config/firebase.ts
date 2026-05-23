import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAdXjsYhaowWrDYduJyzOzJmahKMOJsGTE",
  authDomain: "culture-go-168db.firebaseapp.com",
  projectId: "culture-go-168db",
  storageBucket: "culture-go-168db.firebasestorage.app",
  messagingSenderId: "71355448226",
  appId: "1:71355448226:web:2cbcd49193a64e0b64d0fb",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
