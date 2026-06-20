# Google Maps Integration Setup Guide

This project uses Google Maps API for geolocation and proximity-based job search functionality.

## Quick Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API** (required for autocomplete)
   - **Geocoding API** (optional, for address validation)
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

### 2. Configure API Key Restrictions (Recommended)

For security, restrict your API key:

1. In the API key settings, add **Application restrictions**:
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `https://0470c19c-90a8-4f47-b96f-12e2c0ce5fd7.lovableproject.com/*`
     - `https://yourdomain.com/*` (for production)
     - `http://localhost:*` (for local development)

2. Add **API restrictions**:
   - Select "Restrict key"
   - Choose:
     - Maps JavaScript API
     - Places API

### 3. Add API Key to Your Project

Open `src/components/ui/google-location-autocomplete.tsx` and replace the placeholder:

```typescript
// Line 47
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE";
```

Replace with your actual API key:

```typescript
const GOOGLE_MAPS_API_KEY = "AIza...your-actual-key";
```

## Features Enabled

### ✅ Hospital Job Posting
- Google Maps autocomplete for precise location input
- Automatic GPS coordinate capture (latitude/longitude)
- Pre-fills hospital's existing location
- Stores location data for proximity calculations

### ✅ Job Card Display Logic

**For Authenticated Users (with GPS access):**
- Shows calculated distance (e.g., "7.2 km away")
- Prominent display in primary color
- Updates based on user's current location

**For Unauthenticated Users:**
- Shows neighborhood/locality (e.g., "Jayanagar, Bengaluru")
- Maintains privacy and security
- Falls back to city name if address unavailable

### ✅ Proximity Search
- Real-time GPS location detection
- Haversine formula for accurate distance calculation
- 10 km default search radius
- Adjustable radius (5-100 km)

## Database Schema

The following columns were added to `hospital_profiles`:

```sql
- latitude (DECIMAL 10,8) - GPS latitude coordinate
- longitude (DECIMAL 11,8) - GPS longitude coordinate
- address (TEXT) - Full formatted address from Google Maps
```

## Utility Functions

### Distance Calculation
```typescript
calculateDistance(lat1, lon1, lat2, lon2) // Returns distance in km
```

### Format Distance
```typescript
formatDistance(distanceKm) // Returns "7.2 km away" or "500 m away"
```

### Extract Locality
```typescript
extractLocality(address) // Returns "Jayanagar, Bengaluru"
```

## Troubleshooting

### Issue: "Google Maps API key not configured"
**Solution:** Add your API key to `google-location-autocomplete.tsx`

### Issue: Autocomplete not working
**Solution:** 
1. Verify Places API is enabled in Google Cloud Console
2. Check API key restrictions allow your domain
3. Check browser console for errors

### Issue: Location not detected
**Solution:**
1. Grant browser location permissions
2. Use HTTPS (required for geolocation API)
3. Check browser privacy settings

### Issue: Distance not showing on job cards
**Solution:**
1. Ensure hospitals have posted jobs with location data
2. Verify user has granted location permission
3. Check that hospital profiles have latitude/longitude saved

## API Usage & Pricing

Google Maps Platform offers a free tier:
- **$200 monthly credit** (covers ~28,000 autocomplete requests)
- Places Autocomplete: ~$2.83 per 1,000 requests
- Maps JavaScript API: $7 per 1,000 loads

For more details, visit [Google Maps Pricing](https://mapsplatform.google.com/pricing/)

## Security Best Practices

1. ✅ **Always restrict your API key** to specific domains
2. ✅ **Never commit API keys** to public repositories
3. ✅ Use environment variables for production deployments
4. ✅ Monitor API usage in Google Cloud Console
5. ✅ Set up billing alerts

## Next Steps

Consider implementing:
- **Map view** showing all job locations on an interactive map
- **Batch geocoding** for existing hospital addresses
- **Route calculation** showing estimated travel time
- **Area-based filters** (e.g., "Show all jobs in South Bengaluru")
