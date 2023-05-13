import { ZettelServices } from '@zettelyay/api-server'
import { EXTENSION_ACCESS_KEY } from './constants'

export const restApiClient = new ZettelServices.Extension.Rest({
  extensionRestApiBaseUrl: undefined,
  extensionAccessKey: EXTENSION_ACCESS_KEY,
})
