# PennDash - React Native App

A dining hall delivery app for UPenn students built with React Native and Expo.

## Features

1. **Login & Verification** - Validates UPenn email addresses (@upenn.edu, @seas.upenn.edu, @wharton.upenn.edu) with email verification
2. **Delivery Requests** - Students can post delivery requests with:
   - Tip amount
   - Dining hall selection
   - Dorm location
   - Order description
3. **Sorted Orders** - All orders sorted by tip amount (lowest to highest)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install the Picker component:
```bash
npx expo install @react-native-picker/picker
```

3. Start the development server:
```bash
npx expo start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Demo Credentials

- **Email:** student@upenn.edu
- **Password:** penn123

## Project Structure

```
penndash/
├── App.js           # Entry point
├── PennDash.js      # Main app component
├── app.json         # Expo configuration
└── package.json     # Dependencies
```

## Customization

### Dining Halls
Edit the `DINING_HALLS` array in `PennDash.js` to add/remove dining locations.

### Dorms
Edit the `DORMS` array in `PennDash.js` to add/remove residence halls.

## Building for Production

```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android
```

## Tech Stack

- React Native
- Expo
- @react-native-picker/picker
