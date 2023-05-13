import { SERVER_BASE_URL } from '../../shared/constants'

export const EXTENSION_ACCESS_KEY = process.env.ZETTEL_EXTENSION_ACCESS_KEY ?? ''

export const GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT = {
  client_id: '783889808992-v3tj0kuhrm1dum1veouc22tppjqsqthm.apps.googleusercontent.com',
  project_id: 'zettel-export-to-docs',
  client_secret: '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',
  redirect_uri: `${SERVER_BASE_URL}/static/authenticated.html`,
} as const
