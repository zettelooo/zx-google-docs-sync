import { ZettelExtensions } from '@zettelooo/extension-api'
import { SERVER_BASE_URL } from './constants'
import { PageExtensionData } from 'shared'

export const provideSignIn: ZettelExtensions.Helper<
  'pagePanel',
  'api' | 'activated' | 'pagePanel',
  [
    {
      onRequestStart: () => void
      onRequestEnd: () => void
    }
  ],
  {
    signIn: () => Promise<void>
  },
  PageExtensionData
> = function ({ api, activatedApi, pagePanelApi }, { onRequestStart, onRequestEnd }) {
  let signInPromise:
    | {
        readonly resolve: () => void
        readonly reject: () => void
      }
    | undefined

  async function signIn(): Promise<void> {
    await initiateSignIn()
    return new Promise((resolve, reject) => {
      signInPromise = { resolve, reject }
    })
  }

  async function initiateSignIn(): Promise<void> {
    try {
      const url = new URL(`${SERVER_BASE_URL}/sign-in-page-url`)
      url.searchParams.set('pid', pagePanelApi.target.pageId)
      const response = await fetch(url.href)
      const { signInUrl } = await response.json()
      if (signInUrl) {
        window.open(signInUrl, 'Sign-in', 'width=600,height=850')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const messageHandlerRegistration = this.register(() => {
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      // TODO: Enable the next line's origin check later on, probably when the extension has its own server:
      // if (event.origin !== '???') return
      if (event.data?.type === 'ZETTEL_EXTENSION_ZETTEL_GOOGLE_DOCS_SYNC_SIGN_IN_SET_CODE') {
        event.stopImmediatePropagation()
        const sourceWindow = event.source as WindowProxy | null
        sourceWindow?.close()
        if (
          event.data.pageId === pagePanelApi.target.pageId &&
          event.data.code &&
          typeof event.data.code === 'string'
        ) {
          onRequestStart()
          try {
            await fetch(`${SERVER_BASE_URL}/activate-by-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pageId: event.data.pageId,
                code: event.data.code,
              }),
            })
            await new Promise(resolve => setTimeout(resolve, 1 * 1000)) // A little more delay to let the mutation arrive at the client
            signInPromise?.resolve()
          } catch (error) {
            console.error(error)
            activatedApi.access.showMessage(api.header.name, 'Failed to activate, please try again.', {
              variant: 'error',
            })
            signInPromise?.reject()
          }
          onRequestEnd()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => void window.removeEventListener('message', handleMessage)
  })

  return {
    signIn,
  }
}
