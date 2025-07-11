// functions/feisty.js

/**
 * This function is the handler for your API endpoint.
 * It runs every time someone visits /api-dance.
 * @param {object} context - The context object provided by Cloudflare Pages.
 */
export async function onRequest(context) {
  // Create an object to hold the random data
  const randomData = {
    random_integer: Math.floor(Math.random() * 100) + 1,
    random_float: Math.random() * 99.0 + 1.0,
    random_boolean: Math.random() < 0.5,
    random_feisty: ['feisty', 'slutty', 'freaky', 'horny', 'violently sexual', 'lucky', 'whorish', 'skanky', 'perverted', 'trampy', 'sleazy', 'depraved', 'lasivious', 'degenerate' ][Math.floor(Math.random() * 14)],
    unique_id: crypto.randomUUID(),
  };

  // Convert the object to a nicely formatted JSON string
  const json = JSON.stringify(randomData, null, 2);

  // Return a new Response object with the JSON data
  return new Response(json, {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  });
}
