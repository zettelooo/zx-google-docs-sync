import { WindowWithExtensionFunction } from '@zettelyay/extension-api'
import { ExtensionScope } from '@zettelyay/models'
import { PageExtensionData } from '../../shared/PageExtensionData'
import { provideSignIn } from './provideSignIn'
import { registerActivator } from './registerActivator'
import { registerQuickAction } from './registerQuickAction'
import { registerTipMessage } from './registerTipMessage'
import { watchPageExtensionData } from './watchPageExtensionData'
import { provideActivate } from './provideActivate'

void ((window as WindowWithExtensionFunction).extensionFunction = function (api) {
  this.while('activated', function ({ activatedApi }) {
    this.while('signedIn', function ({ signedInApi }) {
      this.while('pagePanelRendered', function ({ pagePanelRenderedApi }) {
        if (!this.scopes.includes(ExtensionScope.Page)) return

        const applyPageExtensionData = (): void => {
          if (pageExtensionDataRef.current?.enabled) {
            setPageExtensionData(undefined)
            activate(pageExtensionDataRef.current.command) // TODO: Replace it with signIn() and await here and make that count for this extension's activation somehow
            return
          }
          activateActivator()
          initializeQuickAction(Boolean(pageExtensionDataRef.current?.signedInEmail))
          updateTipMessage(pageExtensionDataRef.current)
        }
        const { pageExtensionDataRef } = watchPageExtensionData.bind(this)({ api }, applyPageExtensionData)

        applyPageExtensionData() //todo: put it after all the needed registrations

        async function setPageExtensionData(newPageExtensionData: PageExtensionData): Promise<void> {
          try {
            loadingIndicatorRegistration.activate()
            await signedInApi.access.setPageExtensionData<PageExtensionData>(
              pagePanelRenderedApi.target.pageId,
              newPageExtensionData
            )
          } catch {
            // Do nothing!
          } finally {
            loadingIndicatorRegistration.deactivate()
          }
        }

        const { signIn } = provideSignIn.bind(this)(
          { api, activatedApi, pagePanelRenderedApi },
          {
            onRequestStart() {
              setQuickActionDisabled(true)
              loadingIndicatorRegistration.activate()
            },
            onRequestEnd() {
              setQuickActionDisabled(false)
              loadingIndicatorRegistration.deactivate()
            },
          }
        )

        const { activate } = provideActivate({ signIn })

        const { activateActivator } = registerActivator.bind(this)({ pagePanelRenderedApi }, { activate })

        const { initializeQuickAction, setQuickActionDisabled } = registerQuickAction.bind(this)(
          { api, pagePanelRenderedApi },
          { setPageExtensionData, signIn }
        )

        const loadingIndicatorRegistration = this.register(
          pagePanelRenderedApi.registry.loadingIndicator(() => 'Initializing synchronization...'),
          { initiallyInactive: true }
        )

        const { updateTipMessage } = registerTipMessage.bind(this)({ api, pagePanelRenderedApi })
      })
    })
  })
})
