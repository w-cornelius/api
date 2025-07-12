// functions/twitch-raffle.js

/**
 * Refreshes the Twitch access token using the refresh token and saves the new tokens to KV.
 * @param {object} env - The environment object containing secrets and KV bindings.
 * @returns {string} The new access token.
 */
async function refreshAccessToken(env) {
  console.log("Access token expired or invalid. Attempting to refresh...");
  const url = 'https://id.twitch.tv/oauth2/token';
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.TWITCH_REFRESH_TOKEN,
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token. Status: ${response.status}. Body: ${errorText}`);
  }

  const tokenData = await response.json();
  
  // Save the new tokens to the KV store for the next run.
  // The key 'twitch_access_token' will hold the current valid token.
  await env.TWITCH_TOKENS.put('twitch_access_token', tokenData.access_token, {
      expirationTtl: tokenData.expires_in - 60 // Expire 1 minute before Twitch does
  });
  
  console.log("Successfully refreshed and saved new access token.");
  return tokenData.access_token;
}

/**
 * Main handler for the /twitch-raffle endpoint.
 * @param {object} context The context object from Cloudflare.
 */
export async function onRequest(context) {
  const { env } = context; // Destructure env from context for easier access

  // Check if the required secrets and KV binding are set up.
  if (!env.TWITCH_BROADCASTER_ID || !env.TWITCH_BOT_ID || !env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET || !env.TWITCH_REFRESH_TOKEN || !env.TWITCH_TOKENS) {
    return new Response(JSON.stringify({ error: "Server is not configured. Missing required environment variables or KV binding." }), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }

  try {
    // --- Get the current access token from the KV store ---
    let accessToken = await env.TWITCH_TOKENS.get('twitch_access_token');

    // If no token is in KV, or it has expired, refresh it.
    if (!accessToken) {
      accessToken = await refreshAccessToken(env);
    }
    
    let allChatters = [];
    let cursor = null;
    let hasMore = true;

    // --- API Call Logic ---
    const makeApiCall = async (token) => {
        const url = new URL('https://api.twitch.tv/helix/chat/chatters');
        url.searchParams.append('broadcaster_id', env.TWITCH_BROADCASTER_ID);
        url.searchParams.append('moderator_id', env.TWITCH_BOT_ID);
        url.searchParams.append('first', '1000');
        if (cursor) url.searchParams.append('after', cursor);

        return await fetch(url.toString(), {
            headers: {
                'Client-ID': env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            },
        });
    };
    
    // --- Loop to handle Twitch API pagination ---
    while (hasMore) {
        let response = await makeApiCall(accessToken);

        // If the token is expired (401), refresh it and retry the call once.
        if (response.status === 401) {
            accessToken = await refreshAccessToken(env);
            response = await makeApiCall(accessToken); // Retry with the new token
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Twitch API responded with status: ${response.status}. Body: ${errorText}`);
        }

        const data = await response.json();
        allChatters = allChatters.concat(data.data);
        cursor = data.pagination.cursor;
        hasMore = !!cursor;
    }
    
    // --- Process the results ---
    const excludedUsers = new Set([
        'botrixoficial', 'wizebot', 'streamelements', 'nightbot', 'dumiya_', 'djdubc_',
        'dabackup_', 'housemusicislife_', 'dubbychat', 'dubbystestbot', 'blerp',
        'ai_licia', 'soundalerts', 'moobot', 'frostytoolsdotcom', 'fossabot',
        'streamlabs', 'botisimo', 'phantombot', 'lurxx', 'pokemoncommunitygame',
        'sery_bot', 'kofistreambot', 'tangiabot', 'own3d', 'creatisbot', 'regressz'
    ]);

    const eligibleChatters = allChatters.filter(user => 
      user.user_login && !excludedUsers.has(user.user_login.toLowerCase())
    );

    const responseObject = { chatter_count: eligibleChatters.length };

    if (eligibleChatters.length > 0) {
        const winnerObjects = getRandomElements(eligibleChatters, 3);
        const winnerNames = winnerObjects.map(winner => winner.user_name);
        winnerNames.forEach((name, index) => {
            responseObject[`winner_${index + 1}`] = name;
        });
    }

    return new Response(JSON.stringify(responseObject, null, 2), {
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }
}

/**
 * Helper function to shuffle an array and pick a few items.
 * @param {object[]} arr The array of user objects to shuffle.
 * @param {number} num The number of items to select.
 * @returns {object[]} An array of randomly selected user objects.
 */
function getRandomElements(arr, num) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}
