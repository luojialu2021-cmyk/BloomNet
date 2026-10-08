import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);
//const stripePromise = loadStripe("pk_test_51SQsbw4tcfWVGmh6G9LH0761UJZAeB8CCl1pcXXFOITG8WIDTuNul5kFAuimVw4B2FcA55TxYHvXZrj890qGqc7B00n3RjeMOG")
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
      <App />
    </Elements>
  </React.StrictMode>
);
