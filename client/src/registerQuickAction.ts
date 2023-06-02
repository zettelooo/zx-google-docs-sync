import { ZettelExtensions } from '@zettelooo/extension-api'
import { PageExtensionData } from 'shared'

export const registerQuickAction: ZettelExtensions.Helper<
  'pagePanel',
  'api' | 'pagePanel',
  [
    {
      setPageExtensionData: (pageExtensionData: PageExtensionData) => Promise<void>
      signIn: () => Promise<void>
    }
  ],
  {
    initializeQuickAction: (switchChecked: boolean) => void
    setQuickActionDisabled: (disabled: boolean) => void
  }
> = function ({ api, pagePanelApi }, { setPageExtensionData, signIn }) {
  const quickActionRegistration = this.register(
    pagePanelApi.registry.quickAction(() => ({
      title: api.header.name,
      description: api.header.description,
      avatarUrl: api.header.avatarUrl,
      disabled: true,
      switchChecked: false,
      async onClick() {
        await signIn()
      },
      async onToggleSwitch(checked) {
        if (!checked) {
          await setPageExtensionData(undefined)
        } else {
          await signIn()
        }
      },
    }))
  )

  return {
    initializeQuickAction(switchChecked) {
      quickActionRegistration.reference.current?.update({
        disabled: false,
        switchChecked,
      })
    },
    setQuickActionDisabled(disabled) {
      quickActionRegistration.reference.current?.update({ disabled })
    },
  }
}
