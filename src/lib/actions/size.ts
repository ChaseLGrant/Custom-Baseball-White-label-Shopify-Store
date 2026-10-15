"use server";
// Public size collection: anyone with a team's size link can add or update
// their own roster entry (name, number, sizes). No account needed.
import { revalidatePath } from "next/cache";
import { db } from "../server/db";
import { APPAREL_SIZES, HAT_SIZES } from "../sizes";
import { action, str } from "./util";

const MAX_PLAYERS = 150;

export const submitSize = action(async (_prev: unknown, fd: FormData) => {
  const team = await db.team.findUnique({ where: { sizeLinkToken: str(fd, "token") } });
  if (!team || team.archived) throw new Error("This size link is no longer active. Ask your coach for a new one.");

  const name = str(fd, "name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) throw new Error("Enter the player's name.");
  const number = str(fd, "number").replace(/^#/, "") || null;
  if (number && !/^\d{1,3}$/.test(number)) throw new Error("Jersey number should be 0–999.");
  const size = str(fd, "size");
  if (!(APPAREL_SIZES as readonly string[]).includes(size)) throw new Error("Pick a shirt size.");
  const bottom = str(fd, "bottomSize");
  const bottomSize = (APPAREL_SIZES as readonly string[]).includes(bottom) ? bottom : null;
  const hat = str(fd, "hatSize");
  const hatSize = (HAT_SIZES as readonly string[]).includes(hat) ? hat : null;

  const roster = await db.rosterPlayer.findMany({ where: { teamId: team.id } });
  const existing = roster.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (number && roster.some((p) => p.number === number && p.id !== existing?.id)) {
    throw new Error(`#${number} is already taken on this team. Pick another number.`);
  }

  const data = { name, number, size, topSize: null, bottomSize, hatSize };
  if (existing) {
    await db.rosterPlayer.update({ where: { id: existing.id }, data });
  } else {
    if (roster.length >= MAX_PLAYERS) throw new Error("This roster is full. Ask your coach.");
    await db.rosterPlayer.create({ data: { ...data, teamId: team.id, sortOrder: roster.length } });
  }
  revalidatePath(`/size/${team.sizeLinkToken}`);
  revalidatePath(`/app/teams/${team.id}`);
  return `${existing ? "Updated" : "Added"} ${name}${number ? ` #${number}` : ""} · size ${size}. Thanks! Your coach will see it right away.`;
});
