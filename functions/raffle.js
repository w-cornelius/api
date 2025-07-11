// functions/raffle.js

/**
 * Helper function to shuffle an array and pick a few items.
 * @param {string[]} arr The array to shuffle.
 * @param {number} num The number of items to select.
 * @returns {string[]} An array of randomly selected items.
 */
function getRandomElements(arr, num) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

/**
 * This is the main handler for the /raffle endpoint.
 * @param {object} context The context object from Cloudflare.
 */
export async function onRequest(context) {
  const excludedUsers = new Set([
    'botrixoficial', 'wizebot', 'streamelements', 'nightbot',
    'dumiya_', 'djdubc_', 'dabackup_', 'housemusicislife_',
    'dubbychat', 'dubbystestbot'
  ]);

  const { searchParams } = new URL(context.request.url);
  const channel = searchParams.get('channel');

  if (!channel) {
    const errorResponse = {
      error: 'Please provide a channel name in the URL.',
      example: 'https://your-site.pages.dev/raffle?channel=your_twitch_name'
    };
    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 400,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }

  try {
    // --- NEW API ENDPOINT ---
    // Fetch the list of chatters from the public StreamElements API.
    const response = await fetch(`https://api.streamelements.com/kappa/v2/chatstats/${channel.toLowerCase()}/stats`);
    
    if (!response.ok) {
      throw new Error(`StreamElements API responded with status: ${response.status}.`);
    }

    const data = await response.json();
    
    // The StreamElements API returns a list of users in the 'chatters' property.
    const allChatters = data.chatters || [];

    const eligibleChatters = allChatters.filter(user => !excludedUsers.has(user.toLowerCase()));

    if (eligibleChatters.length === 0) {
      return new Response(JSON.stringify({ winners: [], chatter_count: 0 }), {
        headers: { 'content-type': 'application/json;charset=UTF-8' },
      });
    }

    const winners = getRandomElements(eligibleChatters, 3);

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
