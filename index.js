// @ts-check

import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import { WebhookClient } from "discord.js";

/** @type {Map<string, string[]>} */
const forumWebhooks = new Map();
for (const [forum, webhooks] of /** @type {[string, string[]][]} */ (
  Object.entries(JSON.parse(readFileSync("./config.json").toString()))
))
  forumWebhooks.set(forum, webhooks);

/** @type {Map<string, string[]>} */
let forumApps = new Map();
let firstInterval = true;

async function main() {
  /** @type {Map<string, string[]>} */
  const newForumApps = new Map();
  /** @type {Map<string, string[]>} */
  const webhookMessages = new Map();

  for (const [forum, webhooks] of forumWebhooks.entries()) {
    /** @type {Response} */
    let response;
    try {
      response = await fetch(forum);
    } catch (error) {
      console.error(error);
      continue;
    }

    if (response.status !== 200) continue;

    for (const element of new JSDOM(
      await response.arrayBuffer(),
    ).window.document.querySelectorAll("ol li div h4 span a")) {
      const link = element.getAttribute("href");

      if (!link) continue;

      if (!newForumApps.has(forum)) newForumApps.set(forum, []);
      newForumApps.get(forum)?.push(link);

      if (firstInterval) continue;

      if ((forumApps.get(forum) || []).includes(link)) continue;

      for (const webhook of webhooks) {
        if (!webhookMessages.has(webhook)) webhookMessages.set(webhook, []);
        webhookMessages.get(webhook)?.push(link);
      }
    }
  }

  for (const [webhook, messages] of webhookMessages) {
    try {
      new WebhookClient({ url: webhook }).send({
        content: messages.join("\n"),
      });
    } catch (error) {
      console.error(error);
      continue;
    }
  }

  forumApps = newForumApps;
  firstInterval = false;
}

main();
setInterval(main, parseInt(process.env.TIMEOUT || "0") * 60 * 1000);
