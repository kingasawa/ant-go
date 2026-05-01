/**
 * GET /auth/github
 * GitHub App callback URL — nhận redirect sau khi user cài App.
 * Query: { code, installation_id, setup_action, state }
 *
 * Cùng logic với /api/github/callback.
 */
export { GET } from "@/app/api/github/callback/route";
