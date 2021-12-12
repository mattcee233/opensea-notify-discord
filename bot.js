require("dotenv").config(); // pull in our variables from the .env file
const { Client, Intents } = require("discord.js"); // setup bits of discord we require
const axios = require("axios"); // used for making requests to openseas API
axios.defaults.headers.common["X-API-KEY"] = process.env.openseaKey; // set our opensea API token
axios.defaults.headers.common["Accept"] = "application/json"; // we want opensea to respond in JSON

const botIntents = new Intents(); // not really required but Discord requires this to log a bot in these days...
botIntents.add(Intents.FLAGS.GUILD_MESSAGES);

let channel; // storage variable for our discord channel to talk into
let lastChecked = new Date(); // storage variable for the last time we checked opensea for new transactions

function runBot() {
  // initial bot setup function which gets run on startup
  try {
    const client = new Client({
      // create a bot client configuration
      intents: botIntents,
      partials: ["CHANNEL", "MESSAGE"],
    });
    client.on("ready", async () => {
      // setup actions to take once the bot connects including to:
      console.log("Successfully logged in as " + client.user.tag); // log in console that the bot has correctly logged in
      channel = await client.channels.fetch(process.env.channelId); // set our storage variable for our announcement channel

      setInterval(() => {
        // setup a timer which triggers on our intervals to do our announcements
        watchOpensea(); // announcement function call
      }, Number(process.env.checkInterval) * 1000);
    });
    client.login(process.env.botToken); // tell the bot to try to log in now we have set up its actions
  } catch (err) {
    console.error(
      "Something went wrong when trying to setup/connect the bot to discord...\nDumping error log..."
    );
    console.error(err);
    process.exit();
  }
}

async function watchOpensea() {
  // announcement function
  console.log(new Date() + " - checking for any new sales...");
  try {
    let eventsQuery = await axios.get(
      // get data for any new sales since the last time we checked
      "https://api.opensea.io/api/v1/events?collection_slug=" +
        process.env.collection_slug +
        "&event_type=successful&only_opensea=false&occurred_after=" +
        Math.floor(lastChecked.getTime() / 1000)
    );

    try {
      let price, usdPrice, currency;
      // loop thorugh sales and announce them
      for (let token of eventsQuery.data.asset_events) {
        // do some basic calcs to make our life more readable below...
        price = token.total_price / Math.pow(10, token.payment_token.decimals);
        usdPrice =
          Math.round(price * token.payment_token.usd_price * 100) / 100;
        currency = token.payment_token.symbol;
        await channel.send({
          // send announcement to channel
          embeds: [
            {
              url: token.asset.permalink, // link to the token permalink
              title: "Sold " + token.asset.name + "! NOMNOMNOM", // title text
              description:
                "**Price:** " + // price info
                price +
                currency +
                "\n**USD Price:** $" +
                usdPrice +
                "\n**Seller:** " +
                (token.seller.user.username // sometimes the buyer/sellers name is not known and would display as "null", this makes it read as "Unknown" instead, looks prettier
                  ? token.seller.user.username
                  : "Unknown") +
                "\n**Buyer:** " +
                (token.winner_account.user.username // same prettification as above
                  ? token.winner_account.user.username
                  : "Unknown"),
              image: {
                url: token.asset.image_original_url, // include image of the token
              },
            },
          ],
        });
      }

      lastChecked = new Date(); // update our last checked date for next time we are called
    } catch (err) {
      console.error(
        "Something went wrong when trying to publish sales to Discord...\nDumping error log..."
      );
      console.error(err);
    }
  } catch (err) {
    console.error(
      "Something went wrong when getting data from OpenSea...\nDumping error log..."
    );
    console.error(err);
  }
}
runBot(); // start!
