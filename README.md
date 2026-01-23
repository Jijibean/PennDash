# PennDash - Campus Food Delivery

A food delivery app designed for UPenn students to request and fulfill dining hall deliveries.

## Features

- **Email Verification**: Login with your Penn email (@upenn.edu, @seas.upenn.edu, @wharton.upenn.edu, @sas.upenn.edu)
- **Delivery Requests**: Post requests with your offer amount, dining hall, and dorm
- **Order Board**: View all open deliveries sorted by price (lowest first)
- **Claim Deliveries**: Pick up orders to earn money

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

## Tech Stack

- React 18
- Vite
- LocalStorage for data persistence

## Usage

1. Enter your Penn email (e.g., `yourname@seas.upenn.edu`)
2. Enter the verification code shown (demo mode)
3. Post delivery requests or claim open orders
