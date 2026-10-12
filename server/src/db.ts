import { MongoClient } from "mongodb";

export type Event = {
  session_id: string;
  type: "page_view" | "click";
  site: string;
  page_url: string;
  ts: Date;
  received_at: Date;
  x?: number;
  y?: number;
  vw?: number;
  dw?: number;
  dh?: number;
  rage?: boolean;
};

const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://localhost:27017");

export const events = client.db("analytics").collection<Event>("events");

export async function connectDb() {
  await client.connect();

  // session journey: all events of a session in order
  await events.createIndex({ session_id: 1, ts: 1 });
  // heatmap: all clicks on a page
  await events.createIndex({ page_url: 1, type: 1 });
}
