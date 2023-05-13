import { OAuth2Client } from 'google-auth-library'
import { GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT } from './constants'

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT.client_id,
    GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT.client_secret,
    GOOGLE_CLOUD_CREDENTIAL_WEB_CLIENT.redirect_uri
  )
}
