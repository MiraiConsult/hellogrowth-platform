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
    const fields = [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'website',
      'rating',
      'user_ratings_total',
      'reviews',
      'opening_hours',
      'photos',
      'types',
      'business_status',
      'url',
      'price_level'
    ].join(',');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Places API');
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({
        result: null,
        status: data.status,
        message: data.error_message || 'Error fetching place data'
      });
    }

    return NextResponse.json({
      result: data.result,
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
