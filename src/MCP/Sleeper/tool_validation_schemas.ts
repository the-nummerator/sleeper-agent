import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// League tool schemas
export const GetLeagueSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

export const GetLeagueRostersSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

export const GetLeagueUsersSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

export const GetLeagueMatchupsSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  week: z.number().min(1).max(18).describe("Week number (1-18)"),
});

export const GetPlayoffBracketSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  bracket_type: z.enum(["winners", "losers"]).describe("Type of playoff bracket"),
});

export const GetTransactionsSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  round: z.number().min(1).describe("Round/week number"),
});

export const GetTradedPicksSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

// Avatar tool schemas
export const GetAvatarSchema = z.object({
  avatar_id: z.string().describe("Avatar identifier"),
  size: z.enum(["full", "thumb"]).describe("Avatar size - full or thumbnail"),
});

// User tool schemas
export const GetUserByIdSchema = z.object({
  user_id: z.string().describe("Unique user identifier"),
});

export const GetUserByUsernameSchema = z.object({
  username: z.string().describe("User's username"),
});