# Strava Integration for Lap Analyzer

This document explains how to set up and use the Strava integration feature in the Lap Analyzer application.

## Overview

The Strava integration allows you to:
- Connect your Strava account to the lap analyzer
- Browse and load your Strava activities directly into the analyzer
- Analyze Strava activities alongside FIT files using the same comparison tools
- Access heart rate, power, cadence, and other data streams from Strava

## Setup Instructions

### 1. Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click "Create App" or use an existing application
3. Fill in the required information:
   - **Application Name**: Your app name (e.g., "Lap Analyzer")
   - **Category**: Choose appropriate category
   - **Club**: Leave blank unless applicable
   - **Website**: Your website or localhost for development
   - **Authorization Callback Domain**: For local development, use `localhost`

4. Note down your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Strava credentials:
   ```env
   VITE_STRAVA_CLIENT_ID=your_actual_client_id
   VITE_STRAVA_CLIENT_SECRET=your_actual_client_secret
   VITE_STRAVA_REDIRECT_URI=http://localhost:5173/strava-callback.html
   ```

### 3. Update Strava App Settings

In your Strava API application settings, set the **Authorization Callback Domain** to match your redirect URI:
- For local development: `localhost`
- For production: your actual domain

## How It Works

### Authentication Flow

1. User clicks "Connect with Strava" in the application
2. A popup window opens with Strava's OAuth authorization page
3. User grants permissions to the application
4. Strava redirects to the callback page with an authorization code
5. The application exchanges the code for access and refresh tokens
6. Tokens are stored in localStorage for future use

### Data Processing

1. When loading a Strava activity:
   - Fetches detailed activity information from Strava API
   - Retrieves activity streams (time-series data)
   - Converts Strava data format to internal FIT file format
   - Creates lap segments from Strava lap data or full activity
   - Integrates seamlessly with existing analysis tools

### Supported Data Streams

- **Time**: Required for all activities
- **Heart Rate**: If available in the activity
- **Power**: If available in the activity  
- **Cadence**: If available in the activity
- **Speed**: Velocity data
- **Altitude**: Elevation data
- **GPS**: Latitude/longitude coordinates

## Usage

### Connecting to Strava

1. Open the Lap Analyzer application
2. In the left sidebar, find the "Strava Integration" section
3. Click "Connect with Strava"
4. A popup will open - log in to Strava and authorize the application
5. Once connected, you'll see your athlete information

### Loading Activities

1. After connecting, you'll see a "Load Activity by ID" section
2. To load a Strava activity:
   - Go to the Strava activity page in your browser
   - Copy the activity ID from the URL (e.g., in `strava.com/activities/12345678901`, the ID is `12345678901`)
   - Paste the ID into the input field
   - Click "Load Activity"
3. The activity will be fetched and converted for analysis
4. Successfully loaded activities will appear in the file list with a ".strava" extension

### Analyzing Strava Data

Once loaded, Strava activities work exactly like FIT files:
- They appear in the file list with a ".strava" extension
- You can select laps for comparison
- All analysis tools (charts, time analysis) work the same way
- You can compare Strava activities with FIT files

## API Rate Limits

Strava has API rate limits:
- **Short term**: 100 requests per 15 minutes
- **Daily**: 1,000 requests per day

The application handles these limits by:
- Caching activity data locally
- Using efficient API calls
- Providing error messages if limits are exceeded

## Troubleshooting

### Common Issues

1. **"Failed to open authentication popup"**
   - Ensure popups are allowed for the application domain
   - Check if popup blockers are interfering

2. **"Authentication failed"**
   - Verify your Client ID and Client Secret are correct
   - Check that the redirect URI matches your Strava app settings

3. **"This activity does not have the required data streams"**
   - Some activities may not have time-series data available
   - Try a different activity with more detailed recording

4. **API rate limit errors**
   - Wait for the rate limit to reset (15 minutes for short-term limit)
   - Reduce the frequency of API calls

### Development Tips

1. **Testing locally**: Use `http://localhost:5173/strava-callback.html` as your redirect URI
2. **CORS issues**: The Strava API supports CORS for browser requests
3. **Token refresh**: The application automatically refreshes expired tokens

## Security Considerations

1. **Client Secret**: In production, consider using a backend service to handle token exchange
2. **Token Storage**: Tokens are stored in localStorage - consider more secure storage for production
3. **HTTPS**: Use HTTPS in production for secure token transmission
4. **Scope**: The application requests minimal scopes (`read,activity:read_all`)

## File Structure

```
src/
├── types/strava.ts              # TypeScript types for Strava API
├── services/stravaApi.ts        # Strava API service
├── utils/stravaParser.ts        # Converts Strava data to internal format
├── stores/strava.ts             # Pinia store for Strava state management
├── components/
│   ├── StravaConnector.vue      # Authentication component
│   └── StravaActivitySelector.vue # Activity browser component
└── vite-env.d.ts               # Environment variable types

public/
└── strava-callback.html         # OAuth callback handler
```

## Contributing

When contributing to the Strava integration:

1. Follow the existing code patterns
2. Add proper TypeScript types
3. Handle errors gracefully
4. Test with various activity types
5. Consider API rate limits in new features

## Support

For issues related to:
- **Strava API**: Check [Strava Developer Documentation](https://developers.strava.com/)
- **Application bugs**: Create an issue in the project repository
- **Setup questions**: Refer to this documentation or create a discussion
