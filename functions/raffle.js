// functions/raffle.js

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
 * This is the main handler for the /raffle endpoint.
 * @param {object} context The context object from Cloudflare.
 */
export async function onRequest(context) {
  // A set of usernames to exclude from the raffle.
  const excludedUsers = new Set([
    // Original list
    'botrixoficial', 'wizebot', 'streamelements', 'nightbot',
    'dumiya_', 'djdubc_', 'dabackup_', 'housemusicislife_',
    'dubbychat', 'dubbystestbot',
    // --- New users added below ---
    'blerp', 'ai_licia', 'soundalerts', 'moobot', 'frostytoolsdotcom',
    'fossabot', 'streamlabs', 'botisimo', 'phantombot', 'lurxx',
    'pokemoncommunitygame', 'sery_bot', 'kofistreambot', 'tangiabot',
    'own3d', 'creatisbot', 'regressz'
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
    // Fetch the list of chatters from the public StreamElements API.
    const response = await fetch(`https://api.streamelements.com/kappa/v2/chatstats/${channel.toLowerCase()}/stats`);
    
    if (!response.ok) {
      throw new Error(`StreamElements API responded with status: ${response.status}.`);
    }

    const data = await response.json();
    
    // The StreamElements API returns a list of user objects in the 'chatters' property.
    const allChatterObjects = data.chatters || [];

    // Filter the list by checking the 'name' property of each user object.
    const eligibleChatters = allChatterObjects.filter(user => 
      user.name && !excludedUsers.has(user.name.toLowerCase())
    );

    if (eligibleChatters.length === 0) {
      return new Response(JSON.stringify({ winners: [], chatter_count: 0 }), {
        headers: { 'content-type': 'application/json;charset=UTF-8' },
      });
    }

    // Select 3 random winner *objects*.
    const winnerObjects = getRandomElements(eligibleChatters, 3);
    // Extract just the name from each winner object to create a simple list.
    const winners = winnerObjects.map(winner => winner.name);

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
