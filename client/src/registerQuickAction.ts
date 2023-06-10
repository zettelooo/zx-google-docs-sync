import { ZettelExtensions } from '@zettelooo/extension-api'
import { PageExtensionData } from 'shared'

export const registerQuickAction: ZettelExtensions.Helper<
  'pagePanel',
  'api' | 'pagePanel',
  [
    {
      clearPageExtensionData: () => Promise<void>
      signIn: () => Promise<void>
    }
  ],
  {
    initializeQuickAction: (switchChecked: boolean) => void
    setQuickActionDisabled: (disabled: boolean) => void
  },
  PageExtensionData
> = function ({ api, pagePanelApi }, { clearPageExtensionData, signIn }) {
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
          await clearPageExtensionData()
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
