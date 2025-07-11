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
  // --- START OF NEW CODE ---
  // A set of usernames to exclude from the raffle.
  const excludedUsers = new Set([
    'botrixoficial',
    'wizebot',
    'streamelements',
    'nightbot',
    'dumiya_',
    'djdubc_',
    'dabackup_',
    'housemusicislife_',
    'dubbychat',
    'dubbystestbot'
  ]);
  // --- END OF NEW CODE ---

  // Get the channel name from the URL query parameters (e.g., /raffle?channel=yourname)
  const { searchParams } = new URL(context.request.url);
  const channel = searchParams.get('channel');

  // If no channel is provided in the URL, return an error message.
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
    // Fetch the list of chatters from Twitch's public TMI endpoint.
    const response = await fetch(`https://tmi.twitch.tv/group/user/${channel.toLowerCase()}/chatters`);
    
    // If the response from Twitch is not successful, throw an error.
    if (!response.ok) {
        throw new Error(`Twitch API responded with status: ${response.status}. The channel might not exist or be live.`);
    }

    const data = await response.json();

    // The data contains an object 'chatters' with arrays for different user types.
    const chatters = data.chatters;
    const allChatters = [
      ...chatters.vips,
      ...chatters.moderators,
      ...chatters.staff,
      ...chatters.admins,
      ...chatters.global_mods,
      ...chatters.viewers,
    ];

    // --- START OF MODIFIED CODE ---
    // Filter the list of all chatters to remove the excluded users.
    const eligibleChatters = allChatters.filter(user => !excludedUsers.has(user.toLowerCase()));
    // --- END OF MODIFIED CODE ---

    // If there are no eligible chatters, return an empty array of winners.
    if (eligibleChatters.length === 0) {
        return new Response(JSON.stringify({ winners: [] }), {
            headers: { 'content-type': 'application/json;charset=UTF-8' },
        });
    }

    // Select 3 random winners from the list of eligible chatters.
    const winners = getRandomElements(eligibleChatters, 3);

    // Return the winners as a JSON response.
    return new Response(JSON.stringify({ winners: winners }, null, 2), {
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });

  } catch (error) {
    // Handle any other errors that occur during the fetch.
    return new Response(JSON.stringify({ error: error.message }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }
}
