// Vercel Serverless Function - Beehiiv Subscription for Hook Generator
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, topic, platform, waitlist, interest } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
    const PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

    if (!BEEHIIV_API_KEY || !PUBLICATION_ID) {
        console.error('Missing Beehiiv credentials');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const response = await fetch(
            `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BEEHIIV_API_KEY}`
                },
                body: JSON.stringify({
                    email: email,
                    reactivate_existing: true,
                    send_welcome_email: true,
                    utm_source: waitlist ? 'hook_generator_waitlist' : 'hook_generator',
                    utm_medium: 'website',
                    custom_fields: [
                        { name: 'topic_hookgen', value: topic || '' },
                        { name: 'coresocial', value: platform || '' },
                        ...(waitlist ? [{ name: 'waitlist_hookgen', value: interest === 'yes' ? 'yes-would-pay' : 'maybe-interested' }] : [])
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Beehiiv API error:', data);
            return res.status(response.status).json({ error: data.message || 'Subscription failed' });
        }

        return res.status(200).json({ 
            success: true, 
            data,
            debug: {
                pubId: PUBLICATION_ID.slice(0, 10) + '...',
                status: response.status
            }
        });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
