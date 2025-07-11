// functions/twitch-raffle.js

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

/**
 * Main handler for the /twitch-raffle endpoint.
 * @param {object} context The context object from Cloudflare, containing environment variables.
 */
export async function onRequest(context) {
  // --- Credentials from Cloudflare Secrets ---
  const broadcasterId = context.env.TWITCH_BROADCASTER_ID;
  const moderatorId = context.env.TWITCH_BOT_ID;
  const clientId = context.env.TWITCH_CLIENT_ID;
  const accessToken = context.env.TWITCH_ACCESS_TOKEN;

  // Check if the required secrets are set up.
  if (!broadcasterId || !moderatorId || !clientId || !accessToken) {
    return new Response(JSON.stringify({ error: "Server is not configured. Missing required environment variables." }), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }

  const excludedUsers = new Set([
    'botrixoficial', 'wizebot', 'streamelements', 'nightbot', 'dumiya_', 'djdubc_',
    'dabackup_', 'housemusicislife_', 'dubbychat', 'dubbystestbot', 'blerp',
    'ai_licia', 'soundalerts', 'moobot', 'frostytoolsdotcom', 'fossabot',
    'streamlabs', 'botisimo', 'phantombot', 'lurxx', 'pokemoncommunitygame',
    'sery_bot', 'kofistreambot', 'tangiabot', 'own3d', 'creatisbot', 'regressz'
  ]);

  try {
    let allChatters = [];
    let cursor = null;
    let hasMore = true;

    // --- Loop to handle Twitch API pagination ---
    while (hasMore) {
      const url = new URL('https://api.twitch.tv/helix/chat/chatters');
      url.searchParams.append('broadcaster_id', broadcasterId);
      url.searchParams.append('moderator_id', moderatorId);
      url.searchParams.append('first', '1000'); // Max allowed per page

      if (cursor) {
        url.searchParams.append('after', cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twitch API responded with status: ${response.status}. Body: ${errorText}`);
      }

      const data = await response.json();
      allChatters = allChatters.concat(data.data);
      
      cursor = data.pagination.cursor;
      hasMore = !!cursor;
    }

    // Filter out excluded bots and accounts
    const eligibleChatters = allChatters.filter(user => 
      user.user_login && !excludedUsers.has(user.user_login.toLowerCase())
    );

    if (eligibleChatters.length === 0) {
      return new Response(JSON.stringify({ winners: [], chatter_count: 0 }), {
        headers: { 'content-type': 'application/json;charset=UTF-8' },
      });
    }

    // Select 3 random winner objects
    const winnerObjects = getRandomElements(eligibleChatters, 3);
    // Extract just the display name from each winner object
    const winners = winnerObjects.map(winner => winner.user_name);

    return new Response(JSON.stringify({ winners, chatter_count: eligibleChatters.length }, null, 2), {
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }
}
