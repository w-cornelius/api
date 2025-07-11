// functions/raffle.js

/**
 * Helper function to shuffle an array and pick a few items.
 * @param {string[]} arr The array to shuffle.
 * @param {number} num The number of items to select.
 * @returns {string[]} An array of randomly selected items.
 */
function getRandomElements(arr, num) {
  // Create a copy of the array and shuffle it
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  // Return the first `num` elements
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
    const twitchUrl = `https://tmi.twitch.tv/group/user/${channel.toLowerCase()}/chatters`;

    // --- START OF MODIFIED CODE ---
    // Make the fetch request with a User-Agent header. Some APIs block requests without one.
    const response = await fetch(twitchUrl, {
      headers: {
        'User-Agent': 'Cloudflare-Worker-Raffle-Bot/1.0'
      }
    });
    // --- END OF MODIFIED CODE ---
    
    if (!response.ok) {
        // If the response fails, try to get more error details from Twitch's response body
        const errorBody = await response.text();
        throw new Error(`Twitch API responded with status: ${response.status}. URL: ${twitchUrl}. Body: ${errorBody}`);
    }

    const data = await response.json();
    const chatters = data.chatters;
    const allChatters = [
      ...chatters.vips, ...chatters.moderators, ...chatters.staff,
      ...chatters.admins, ...chatters.global_mods, ...chatters.viewers,
    ];

    const eligibleChatters = allChatters.filter(user => !excludedUsers.has(user.toLowerCase()));

    if (eligibleChatters.length === 0) {
        return new Response(JSON.stringify({ winners: [], chatter_count: 0 }), {
            headers: { 'content-type': 'application/json;charset=UTF-8' },
        });
    }

    const winners = getRandomElements(eligibleChatters, 3);

    // I've also added the chatter_count to the response for debugging
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
