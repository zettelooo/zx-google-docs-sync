import { ZettelExtensions } from '@zettelooo/extension-api'
import { PageExtensionData } from 'shared'
import { provideActivate } from './provideActivate'
import { provideSignIn } from './provideSignIn'
import { registerQuickAction } from './registerQuickAction'
import { registerTipMessage } from './registerTipMessage'

void ((window as ZettelExtensions.WindowWithStarter).$starter = function (api) {
  this.while('activated', function ({ activatedApi }) {
    this.while('signedIn', function ({ signedInApi }) {
      this.while('pagePanel', function ({ pagePanelApi }) {
        if (!this.scopes.includes(ZettelExtensions.Scope.Page)) return

        async function setPageExtensionData(newPageExtensionData: PageExtensionData): Promise<void> {
          try {
            loadingIndicatorRegistration.activate()
            await signedInApi.access.setPageExtensionData<PageExtensionData>(
              pagePanelApi.target.pageId,
              newPageExtensionData
            )
          } catch {
            // Do nothing!
          } finally {
            loadingIndicatorRegistration.deactivate()
          }
        }

        const { signIn } = provideSignIn.bind(this)(
          { api, activatedApi, pagePanelApi },
          {
            onRequestStart() {
              // setQuickActionDisabled(true)
              loadingIndicatorRegistration.activate()
            },
            onRequestEnd() {
              // setQuickActionDisabled(false)
              loadingIndicatorRegistration.deactivate()
            },
          }
        )

        const { activate } = provideActivate({ signIn })

        const { initializeQuickAction, setQuickActionDisabled } = registerQuickAction.bind(this)(
          { api, pagePanelApi },
          { setPageExtensionData, signIn }
        )

        const loadingIndicatorRegistration = this.register(
          pagePanelApi.registry.loadingIndicator(() => 'Initializing synchronization...'),
          { initiallyInactive: true }
        )

        const { updateTipMessage } = registerTipMessage.bind(this)({ api, pagePanelApi })

        this.register(
          pagePanelApi.watch(
            data => data.page.extensionData as PageExtensionData,
            (newValue, oldValue?) => {
              if (newValue?.enabled) {
                setPageExtensionData(undefined)
                activate(newValue.command) // TODO: Replace it with signIn() and await here and make that count for this extension's activation somehow
                return
              }
              initializeQuickAction(Boolean(newValue?.signedInEmail))
              updateTipMessage(newValue)
            },
            {
              initialCallback: true,
            }
          )
        )
      })
    })
  })
})
