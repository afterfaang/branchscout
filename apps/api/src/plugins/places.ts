// Places plugin — `app.places` decorator. Boot zamanında provider seçilir.

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { buildPlacesProvider, type PlacesProvider } from "../providers/places/index.js";

declare module "fastify" {
  interface FastifyInstance {
    places: PlacesProvider;
  }
}

async function placesPlugin(app: FastifyInstance) {
  const provider = buildPlacesProvider(process.env);
  app.log.info({ provider: provider.name }, "places provider initialised");
  app.decorate("places", provider);
}

export default fp(placesPlugin, { name: "places" });
