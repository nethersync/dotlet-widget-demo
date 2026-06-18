import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, accountId } = body;

    const dotletApiUrl = process.env.DOTLET_API_URL || 'https://api.dotlet.net';
    const apiKey = process.env.DOTLET_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DOTLET_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    const response = await fetch(`${dotletApiUrl}/api/v1/hosted/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        external_user_id: userId,
        external_account_id: accountId,
        allowed_actions: [
          'domain_search',
          'domain_purchase',
          'dns_manage',
          'renew',
        ],
        theme_config: {
          brand_name: 'Demo Customer',
          primary_color: '#111827',
          logo_url: 'https://customer.com/logo.svg',
        },
        metadata: {
          plan: 'pro',
        },
        expires_in_minutes: 60,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create session', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating domain session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
