import { ZettelServices } from '@zettelooo/api-server'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import path from 'path'
import { PageExtensionData } from 'shared'
import { PageCredentialsStorage } from './PageCredentialsStorage'
import { SERVER_BASE_URL } from './constants'
import { createOAuth2Client } from './createOAuth2Client'
import { handleApiCallConnectionReset } from './handleApiCallConnectionReset'
import { restApiClient } from './restApiClient'

export function startServer(connection: ZettelServices.Extension.Ws.GetUpdates<PageExtensionData>): void {
  const port = Number(process.env.PORT || 4000)

  const app = express()

  app.set('port', port)
  app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cors())

  app.use('/static', express.static(path.join(__dirname, '..', 'public')))

  app.get('/sign-in-page-url', (req, res, next) => {
    const { pid: pageId } = req.query
    if (!pageId || typeof pageId !== 'string') {
      res.sendStatus(400)
      return
    }
    const client = createOAuth2Client()
    const googleSignInUrl = client.generateAuthUrl({
      access_type: 'offline',
      response_type: 'code',
      prompt: 'select_account consent',
      scope: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/userinfo.email'],
      include_granted_scopes: true,
      state: JSON.stringify({ pageId }),
    })
    const signInUrlObject = new URL(`${SERVER_BASE_URL}/static/sign-in.html`)
    signInUrlObject.searchParams.set('google_sign_in_url', googleSignInUrl)
    const signInUrl = signInUrlObject.href
    res.json({ signInUrl })
  })

  app.post('/activate-by-code', async (req, res, next) => {
    try {
      const { pageId, code } = req.body
      if (!pageId || typeof pageId !== 'string' || !code || typeof code !== 'string') {
        res.sendStatus(400)
        return
      }
      const {
        pages: [page],
      } = await restApiClient.getPages({
        pageIds: [pageId],
        withExtensionInstalled: true,
      })
      if (!page) {
        res.sendStatus(404)
        return
      }
      const client = createOAuth2Client()
      const {
        tokens: { access_token: accessToken, refresh_token: refreshToken, expiry_date: expiryTimestamp },
      } = await handleApiCallConnectionReset(() => client.getToken(code))
      if (!accessToken || !refreshToken || !expiryTimestamp) throw Error('Unable to get credentials from code.')
      const { email: signedInEmail } = await handleApiCallConnectionReset(() => client.getTokenInfo(accessToken))
      if (!signedInEmail) throw Error('Unable to retrieve email from credentials.')
      await PageCredentialsStorage.set(pageId, {
        id: pageId,
        accessToken,
        refreshToken,
        expiryTimestamp,
      })
      await restApiClient.setPageExtensionData({
        pageId,
        data: {
          signedInEmail,
        },
      })
      res.end()
    } catch (error) {
      next(error)
    }
  })

  app.listen(port, () => console.log(`Listening on port ${port}.`))
}
