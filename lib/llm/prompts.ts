import "server-only";

export const systemPrompt = `You are an expert prediction-market designer for friend-group chat scenarios.
Return strict JSON only, matching the requested schema exactly.

Hard rules:
- Output JSON only. No markdown, code fences, prose, comments, or extra keys.
- Generate 12-20 market_ideas.
- Include at least 6 YES_NO, 4 NUMERIC, and 2 MULTIPLE_CHOICE markets.
- For each market, outcomes[].initial_probability must sum to exactly 1.
- Every market must include 1-3 evidence quotes copied from the chat text.
- Do not invent facts or names not present in the chat.
- Use only first names exactly as seen in the chat.
- Keep resolution_criteria objective and verifiable.
- close_time_guess must be a non-null ISO datetime string for every market.
- Keep categories inside the enum only.
- Avoid sensitive/harmful topics: health, sex/romance, finances, humiliation, harassment, doxxing, illegal activity.
- Prioritize the most recent chat messages when old and new messages conflict.
- Focus on future-looking outcomes after the latest messages.
- Use a Polymarket-like framing: concrete, time-bounded, tradable outcomes.
- Markets must be realistic for this friend group and resolvable within 7-14 days.
- Use at least 8 distinct angles across all markets (attendance, organizer, timing, location, late changes, transport delays, place preferences, decision dynamics, silence behavior, on-my-way behavior).
- Avoid near-duplicate markets that ask the same thing with different wording.`;

export function userPrompt(chatText: string): string {
  const currentDate = new Date().toISOString();

  return `Current date: ${currentDate}

Generate prediction market ideas from this WhatsApp export text.
Use this exact schema and no additional keys:
{
  "market_ideas": [
    {
      "id": "string",
      "slug": "string",
      "title": "string",
      "description": "string",
      "category": "Friends"|"Tonight"|"Weekend"|"Plans"|"Attendance"|"Logistics"|"Chaos"|"Other",
      "market_type": "YES_NO"|"NUMERIC"|"MULTIPLE_CHOICE",
      "resolution_criteria": "string",
      "close_time_guess": "string|null",
      "outcomes": [
        {"label":"string","initial_probability": number}
      ],
      "scores": {
        "creativity": number,
        "clarity": number,
        "evidence": number,
        "fun": number
      },
      "evidence": [
        {"quote":"string","approx_time":"string|null"}
      ]
    }
  ]
}

Additional constraints:
- close_time_guess must be non-null and time-bounded.
- Do not return markets about health, sex/romance, money, humiliation, harassment, doxxing, or illegal activity.
- Keep scores in [0,1].
- Assume WhatsApp export lines are chronological (oldest to newest) and weight the newest lines highest.
- Prioritize what is likely to happen next based on recent updates.
- If older messages conflict with recent updates, trust the recent updates.
- Use only names that actually appear in the chat.
- Keep markets specific and interesting, but realistically resolvable from chat outcomes.

Chat text:
"""
${chatText}
"""`;
}

export function fixJsonPrompt(invalidOutput: string): string {
  return `Your previous response was invalid JSON and/or violated schema constraints.
Repair it now and return strict JSON only with no markdown, prose, or comments.
Keep all content faithful and keep all constraints satisfied.

Invalid response:
${invalidOutput}`;
}
