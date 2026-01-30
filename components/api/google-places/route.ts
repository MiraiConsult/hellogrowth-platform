import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    // Return mock data if no API key configured
    return NextResponse.json({
      result: null,
      status: 'NO_API_KEY',
      message: 'Google Places API key not configured. Using basic analysis.'
    });
  }

  try {
    // Use the NEW Places API (v1)
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,reviews,regularOpeningHours,photos,types,businessStatus,googleMapsUri'
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        result: null,
        status: 'ERROR',
        message: errorData.error?.message || 'Failed to fetch place data'
      }, { status: response.status });
    }

    const data = await response.json();

    // Transform NEW API format to match old format for compatibility
    const transformedResult = {
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      formatted_phone_number: data.nationalPhoneNumber || '',
      website: data.websiteUri || '',
      rating: data.rating || 0,
      user_ratings_total: data.userRatingCount || 0,
      reviews: data.reviews?.map((review: any) => ({
        author_name: review.authorAttribution?.displayName || 'Anônimo',
        rating: review.rating || 0,
        text: review.text?.text || '',
        time: review.publishTime ? new Date(review.publishTime).getTime() / 1000 : 0,
        relative_time_description: review.relativePublishTimeDescription || ''
      })) || [],
      opening_hours: data.regularOpeningHours ? {
        open_now: data.regularOpeningHours.openNow || false,
        weekday_text: data.regularOpeningHours.weekdayDescriptions || []
      } : undefined,
      photos: data.photos?.map((photo: any) => ({
        photo_reference: photo.name || ''
      })) || [],
      types: data.types || [],
      business_status: data.businessStatus || 'OPERATIONAL',
      url: data.googleMapsUri || '',
      price_level: 0 // Not available in new API
    };

    return NextResponse.json({
      result: transformedResult,
      status: 'OK'
    });

  } catch (error) {
    console.error('Error fetching Google Places data:', error);
    return NextResponse.json({
      result: null,
      status: 'ERROR',
      message: 'Failed to fetch place data'
    }, { status: 500 });
  }
}
