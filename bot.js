require("dotenv").config();
const { Client, Intents } = require("discord.js");
const axios = require("axios");
axios.defaults.headers.common["X-API-KEY"] = process.env.openseaKey;
axios.defaults.headers.common["Accept"] = "application/json";

const botIntents = new Intents();
botIntents.add(Intents.FLAGS.GUILD_MESSAGES);
let channel;
function runBot() {
  const client = new Client({
    intents: botIntents,
    partials: ["CHANNEL", "MESSAGE"],
  });
  client.on("ready", async () => {
    console.log("Logged in as " + client.user.tag);
    channel = await client.channels.fetch(process.env.channelId);
    await watchOpensea();
    process.exit();
    // setInterval(() => {
    //   watchOpensea();
    // }, 30000);
  });
  client.login(process.env.botToken);
}

let lastChecked = new Date();

async function watchOpensea() {
  try {
    let eventsQuery = await axios.get(
      "https://api.opensea.io/api/v1/events?collection_slug=" +
        process.env.collection_slug +
        "&event_type=successful&only_opensea=true&occurred_after=" +
        Math.floor((lastChecked.getTime() - 3 * 86400000) / 1000)
    );

    let price, usdPrice, currency;
    for (let token of eventsQuery.data.asset_events) {
      price = token.total_price / Math.pow(10, token.payment_token.decimals);
      usdPrice = Math.round(price * token.payment_token.usd_price * 100) / 100;
      currency = token.payment_token.symbol;
      await channel.send({
        embeds: [
          {
            url: token.asset.permalink,
            title: "Sold " + token.asset.name + "!",
            description:
              "**Price:** " +
              price +
              currency +
              " ($" +
              usdPrice +
              ")\n**Seller:** " +
              token.seller.user.username +
              "\n**Buyer:** " +
              (token.winner_account.user.username
                ? token.winner_account.user.username
                : "Unknown"),
            image: {
              url: token.asset.image_original_url,
            },
          },
        ],
      });
    }

    lastChecked = new Date();
  } catch (err) {
    console.log(err);
  }
}
runBot();
