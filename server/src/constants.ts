import { SERVER_BASE_URL } from '../../shared/constants'

export const GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT = {
  client_id: process.env.GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT_CLIENT_ID ?? '',
  project_id: process.env.GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT_PROJECT_ID ?? '',
  client_secret: process.env.GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT_CLIENT_SECRET ?? '',
  redirect_uri: `${SERVER_BASE_URL}/static/authenticated.html`,
} as const
